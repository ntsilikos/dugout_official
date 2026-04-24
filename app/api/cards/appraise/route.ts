import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCardHedgeConfigured, isEbayConfigured } from "@/lib/config";
import {
  buildCardQuery,
  checkAppraisalSanity,
  fetchComps,
  resolveCardhedgeIdForCard,
  scoreEbayAppraisal,
} from "@/lib/pricing";

const COOLDOWN_HOURS = 24;

// Small sleep so we don't blast eBay's rate limits inside a single batch.
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;

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
    type AppraisalCard = {
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
      estimated_value_cents: number | null;
    };

    let cards: AppraisalCard[] = [];

    const { data: cardsData, error: cardsError } = await supabase
      .from("cards")
      .select(
        "id, player_name, year, brand, set_name, card_number, variant, grade_company, grade_value, cardhedge_card_id, estimated_value_cents"
      )
      .eq("user_id", user.id)
      .neq("status", "sold")
      .order("updated_at", { ascending: true });

    if (cardsError) {
      console.error("[appraise] Query error:", cardsError.message);
      // Column might not exist yet — retry without it
      const { data: fallback } = await supabase
        .from("cards")
        .select(
          "id, player_name, year, brand, set_name, card_number, variant, grade_company, grade_value, estimated_value_cents"
        )
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
        flagged: 0,
        no_match: 0,
        skipped: 0,
        total: 0,
        last_appraised_at: new Date().toISOString(),
      });
    }

    console.log(`[appraise] Starting appraisal of ${cards.length} cards`);

    // Capture old total for before/after comparison
    const oldTotalCents = cards.reduce(
      (sum, c) => sum + (c.estimated_value_cents || 0),
      0
    );

    const admin = createAdminClient();
    let verifiedCount = 0; // high-confidence writes
    let flaggedCount = 0; // low/medium-confidence writes or skipped writes
    let noMatchCount = 0; // zero comps
    let errorCount = 0; // pipeline errors

    // Process in batches
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      const batch = cards.slice(i, i + BATCH_SIZE);

      for (const card of batch) {
        try {
          // ---- Resolve CardHedge id (no-op when CardHedge disabled) ----
          const resolved = await resolveCardhedgeIdForCard(user.id, card);

          if (
            resolved.cardhedgeId &&
            !card.cardhedge_card_id &&
            Object.keys(resolved.corrections).length > 0
          ) {
            // New match found — persist the corrections so future runs skip matching
            await admin
              .from("cards")
              .update(resolved.corrections)
              .eq("id", card.id);
            Object.assign(card, resolved.corrections);
            console.log(
              `[appraise] MATCHED via ${resolved.source} (${resolved.confidence.toFixed(2)}): "${buildCardQuery(card)}" → "${resolved.description || "?"}"`
            );
          }

          const pricingInput = {
            ...card,
            cardhedge_card_id: resolved.cardhedgeId || card.cardhedge_card_id,
          };
          const pricingQuery = buildCardQuery(pricingInput);

          if (!pricingQuery.trim()) {
            console.log(`[appraise] SKIP (empty query): card ${card.id}`);
            errorCount++;
            continue;
          }

          const pricing = await fetchComps(pricingInput).catch((err) => {
            console.error(
              `[appraise] fetchComps failed for card ${card.id}:`,
              err instanceof Error ? err.message : err
            );
            return null;
          });

          if (!pricing) {
            errorCount++;
            continue;
          }

          const proposedValue = pricing.median_cents || pricing.average_cents;
          const score = scoreEbayAppraisal(pricing);
          const sanity = checkAppraisalSanity(
            card.estimated_value_cents,
            proposedValue
          );

          // Sanity override: a huge jump downgrades confidence regardless of tier
          const finalShouldWrite = score.shouldWriteValue && sanity.ok;
          const finalStatus =
            !sanity.ok && score.status === "verified"
              ? "needs_review"
              : score.status;
          const finalReason =
            !sanity.ok && sanity.reason ? sanity.reason : score.reason;

          const nowIso = new Date().toISOString();
          const update: Record<string, unknown> = {
            appraisal_status: finalStatus,
            appraisal_confidence:
              score.confidence > 0 ? Number(score.confidence.toFixed(3)) : null,
            appraisal_comp_count: pricing.count,
            appraisal_flag_reason: finalReason,
            appraisal_tier: pricing.tier ?? null,
            last_appraised_at: nowIso,
          };

          if (finalShouldWrite && proposedValue > 0) {
            update.estimated_value_cents = proposedValue;
          }

          await admin.from("cards").update(update).eq("id", card.id);

          if (finalStatus === "verified" && finalShouldWrite) {
            verifiedCount++;
            console.log(
              `[appraise] VERIFIED ${card.id}: $${(proposedValue / 100).toFixed(2)} (conf ${score.confidence.toFixed(2)}, ${pricing.count} comps)`
            );
          } else if (finalStatus === "no_match") {
            noMatchCount++;
            console.log(`[appraise] NO_MATCH ${card.id}: "${pricingQuery}"`);
          } else {
            flaggedCount++;
            console.log(
              `[appraise] FLAGGED ${card.id}: ${finalReason} (conf ${score.confidence.toFixed(2)}, ${pricing.count} comps)`
            );
          }
        } catch (err) {
          console.error(
            `[appraise] ERROR on card ${card.id}:`,
            err instanceof Error ? err.message : err
          );
          errorCount++;
        }
      }

      if (i + BATCH_SIZE < cards.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    // Update last_appraised_at on profile
    const now = new Date().toISOString();
    await admin
      .from("profiles")
      .update({ last_appraised_at: now })
      .eq("id", user.id);

    // Take a portfolio snapshot based on whatever we have now
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

    console.log(
      `[appraise] DONE: ${verifiedCount} verified, ${flaggedCount} flagged, ${noMatchCount} no match, ${errorCount} errors`
    );

    return NextResponse.json({
      updated: verifiedCount, // legacy alias for UI compatibility
      verified: verifiedCount,
      flagged: flaggedCount,
      no_match: noMatchCount,
      skipped: errorCount,
      total: cards.length,
      last_appraised_at: now,
      old_total_cents: oldTotalCents,
      new_total_cents: totalValue,
    });
  });
}
