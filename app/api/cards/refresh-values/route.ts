import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCardHedgeConfigured, isEbayConfigured } from "@/lib/config";
import { matchCard, getPriceEstimate } from "@/lib/cardhedge";
import { buildCardQuery, cardGradeString, fetchCompsEbay } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isCardHedgeConfigured() && !isEbayConfigured()) {
    return NextResponse.json({
      message: "No pricing API configured. Skipping value refresh.",
      updated: 0,
    });
  }

  const supabase = createAdminClient();

  // Get all unsold cards, oldest-updated first
  const { data: cards } = await supabase
    .from("cards")
    .select("id, user_id, player_name, year, brand, set_name, card_number, variant, grade_company, grade_value, cardhedge_card_id, updated_at")
    .neq("status", "sold")
    .order("updated_at", { ascending: true })
    .limit(100);

  if (!cards?.length) {
    return NextResponse.json({ updated: 0, message: "No cards to update" });
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches of 10
  for (let i = 0; i < cards.length; i += 10) {
    const batch = cards.slice(i, i + 10);

    for (const card of batch) {
      try {
        const grade = cardGradeString(card);
        const query = buildCardQuery(card);
        let cardhedgeId = card.cardhedge_card_id;
        let valueCents = 0;

        // CardHedge match (for metadata/ID only, not pricing)
        if (isCardHedgeConfigured() && !cardhedgeId && query.trim()) {
          try {
            const matchResult = await matchCard(query);
            if (matchResult.match && matchResult.match.confidence >= 0.7) {
              cardhedgeId = matchResult.match.card_id;
              await supabase
                .from("cards")
                .update({ cardhedge_card_id: cardhedgeId })
                .eq("id", card.id);
            }
          } catch { /* match failed */ }
        }

        // Layer 1: eBay (PRIMARY pricing source)
        if (isEbayConfigured() && query.trim()) {
          try {
            const ebayComps = await fetchCompsEbay(card);
            if (ebayComps.median_cents > 0) valueCents = ebayComps.median_cents;
          } catch { /* eBay failed */ }
        }

        // Layer 2: CardHedge price fallback
        if (valueCents === 0 && isCardHedgeConfigured() && cardhedgeId) {
          try {
            const estimate = await getPriceEstimate(cardhedgeId, grade);
            if (estimate.price > 0) valueCents = Math.round(estimate.price * 100);
          } catch { /* estimate failed */ }
        }

        if (valueCents > 0) {
          await supabase
            .from("cards")
            .update({ estimated_value_cents: valueCents })
            .eq("id", card.id);
          updated++;
        } else {
          skipped++;
        }
      } catch {
        errors++;
      }
    }

    // Delay between batches
    if (i + 10 < cards.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Take portfolio snapshots for affected users
  const userIds = [...new Set(cards.map((c) => c.user_id))];
  for (const userId of userIds) {
    const { data: userCards } = await supabase
      .from("cards")
      .select("estimated_value_cents")
      .eq("user_id", userId)
      .neq("status", "sold");

    const totalValue = (userCards || []).reduce(
      (sum, c) => sum + (c.estimated_value_cents || 0),
      0
    );

    await supabase.from("portfolio_snapshots").upsert(
      {
        user_id: userId,
        total_value_cents: totalValue,
        card_count: userCards?.length || 0,
        snapshot_date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id,snapshot_date" }
    );
  }

  return NextResponse.json({ updated, skipped, errors, total: cards.length });
}
