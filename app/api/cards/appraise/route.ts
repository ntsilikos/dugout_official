import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCardHedgeConfigured, isEbayConfigured } from "@/lib/config";
import { matchCard, getPriceEstimate } from "@/lib/cardhedge";
import { buildCardQuery, cardGradeString, fetchCompsEbay } from "@/lib/pricing";

const COOLDOWN_HOURS = 24;

export async function POST() {
  return withAuth(async (user, supabase) => {
    if (!isCardHedgeConfigured() && !isEbayConfigured()) {
      return NextResponse.json(
        { error: "No pricing API configured. Connect CardHedge or eBay to appraise." },
        { status: 400 }
      );
    }

    // Check cooldown
    const { data: profile } = await supabase
      .from("profiles")
      .select("last_appraised_at")
      .eq("id", user.id)
      .single();

    if (profile?.last_appraised_at) {
      const lastAppraisal = new Date(profile.last_appraised_at);
      const cooldownEnd = new Date(
        lastAppraisal.getTime() + COOLDOWN_HOURS * 60 * 60 * 1000
      );
      const now = new Date();

      if (now < cooldownEnd) {
        const remainingMs = cooldownEnd.getTime() - now.getTime();
        return NextResponse.json(
          {
            error: "Appraisal on cooldown",
            cooldown_remaining_seconds: Math.ceil(remainingMs / 1000),
            last_appraised_at: profile.last_appraised_at,
          },
          { status: 429 }
        );
      }
    }

    // Get all unsold cards — try with cardhedge_card_id, fall back without
    let cards: {
      id: string;
      player_name: string | null;
      year: number | null;
      brand: string | null;
      set_name: string | null;
      card_number: string | null;
      variant: string | null;
      grade_company: string | null;
      grade_value: number | null;
      cardhedge_card_id: string | null;
    }[] = [];

    const { data: cardsData, error: cardsError } = await supabase
      .from("cards")
      .select(
        "id, player_name, year, brand, set_name, card_number, variant, grade_company, grade_value, cardhedge_card_id"
      )
      .eq("user_id", user.id)
      .neq("status", "sold")
      .order("updated_at", { ascending: true });

    if (cardsError) {
      console.error("[appraise] Query error:", cardsError.message);
      // Column might not exist yet — retry without it
      const { data: fallback } = await supabase
        .from("cards")
        .select("id, player_name, year, brand, set_name, card_number, variant, grade_company, grade_value")
        .eq("user_id", user.id)
        .neq("status", "sold")
        .order("updated_at", { ascending: true });
      cards = (fallback || []).map((c) => ({ ...c, cardhedge_card_id: null }));
    } else {
      cards = cardsData || [];
    }

    if (!cards.length) {
      console.log("[appraise] No unsold cards found for user", user.id);
      return NextResponse.json({
        updated: 0,
        skipped: 0,
        total: 0,
        last_appraised_at: new Date().toISOString(),
      });
    }

    console.log(`[appraise] Starting appraisal of ${cards.length} cards`);

    // Capture old total for before/after comparison
    const { data: oldCards } = await supabase
      .from("cards")
      .select("estimated_value_cents")
      .eq("user_id", user.id)
      .neq("status", "sold");
    const oldTotalCents = (oldCards || []).reduce(
      (sum, c) => sum + (c.estimated_value_cents || 0),
      0
    );

    const admin = createAdminClient();
    let updated = 0;
    let skipped = 0;

    // Process in batches of 10 with 1s delays
    for (let i = 0; i < cards.length; i += 10) {
      const batch = cards.slice(i, i + 10);

      for (const card of batch) {
        try {
          const grade = cardGradeString(card);
          const query = buildCardQuery(card);
          let cardhedgeId = card.cardhedge_card_id;
          let valueCents = 0;

          // ---- Metadata correction via CardHedge (identity only, not pricing) ----
          // Still useful for fixing year/set/variant so the eBay search below is accurate.
          if (isCardHedgeConfigured() && !cardhedgeId && query.trim()) {
            try {
              const matchResult = await matchCard(query);
              if (matchResult.match && matchResult.match.confidence >= 0.7) {
                cardhedgeId = matchResult.match.card_id;
                const m = matchResult.match;
                const yearMatch = m.set?.match(/^(\d{4})\s/);
                const correctedYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
                const setBrand = m.set?.replace(/^\d{4}\s+/, "").replace(/\s+(Baseball|Basketball|Football|Hockey|Soccer)$/i, "") || undefined;

                const corrections: Record<string, unknown> = { cardhedge_card_id: cardhedgeId };
                if (m.player) corrections.player_name = m.player;
                if (correctedYear) corrections.year = correctedYear;
                if (setBrand) corrections.brand = setBrand;
                if (m.set) corrections.set_name = m.set;
                if (m.number) corrections.card_number = m.number;
                if (m.variant) corrections.variant = m.variant;
                if (m.category) corrections.sport = m.category;

                await admin.from("cards").update(corrections).eq("id", card.id);
                // Update our local card object so eBay search uses corrected data
                Object.assign(card, corrections);
                console.log(`[appraise] MATCHED via CardHedge (${m.confidence.toFixed(2)}): "${query}" → "${m.description}"`);
              }
            } catch {
              // CardHedge match failed, continue to eBay anyway
            }
          }

          // ---- Layer 1: eBay Browse API (PRIMARY for pricing) ----
          if (isEbayConfigured() && query.trim()) {
            try {
              const ebayComps = await fetchCompsEbay(card);
              if (ebayComps.median_cents > 0) {
                valueCents = ebayComps.median_cents;
                console.log(`[appraise] PRICED via eBay: $${(valueCents / 100).toFixed(2)} (${ebayComps.count} comps)`);
              }
            } catch {
              // eBay failed too
            }
          }

          // ---- Layer 2: CardHedge price (fallback only when eBay has nothing) ----
          if (valueCents === 0 && isCardHedgeConfigured() && cardhedgeId) {
            try {
              const estimate = await getPriceEstimate(cardhedgeId, grade);
              if (estimate.price > 0) {
                valueCents = Math.round(estimate.price * 100);
                console.log(`[appraise] PRICED via CardHedge (fallback): $${estimate.price.toFixed(2)} (${estimate.grade_label})`);
              }
            } catch {
              // CardHedge estimate failed
            }
          }

          // ---- Update the card ----
          if (valueCents > 0) {
            await admin
              .from("cards")
              .update({ estimated_value_cents: valueCents })
              .eq("id", card.id);
            updated++;
          } else {
            console.log(`[appraise] SKIP (no price data): "${query}"`);
            skipped++;
          }
        } catch (err) {
          console.error(`[appraise] ERROR on card ${card.id}:`, err instanceof Error ? err.message : err);
          skipped++;
        }
      }

      // Delay between batches
      if (i + 10 < cards.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    // Update last_appraised_at
    const now = new Date().toISOString();
    await admin
      .from("profiles")
      .update({ last_appraised_at: now })
      .eq("id", user.id);

    // Take a portfolio snapshot
    const { data: allUserCards } = await admin
      .from("cards")
      .select("estimated_value_cents")
      .eq("user_id", user.id)
      .neq("status", "sold");

    const totalValue = (allUserCards || []).reduce(
      (sum, c) => sum + (c.estimated_value_cents || 0),
      0
    );

    await admin.from("portfolio_snapshots").upsert(
      {
        user_id: user.id,
        total_value_cents: totalValue,
        card_count: allUserCards?.length || 0,
        snapshot_date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id,snapshot_date" }
    );

    return NextResponse.json({
      updated,
      skipped,
      total: cards.length,
      last_appraised_at: now,
      old_total_cents: oldTotalCents,
      new_total_cents: totalValue,
    });
  });
}
