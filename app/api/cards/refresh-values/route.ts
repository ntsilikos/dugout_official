import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCardHedgeConfigured, isEbayConfigured } from "@/lib/config";
import { matchCard } from "@/lib/cardhedge";
import { buildCardQuery, fetchComps } from "@/lib/pricing";
import { isAuthorizedCron } from "@/lib/cron-auth";

async function runRefresh(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
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

        const pricingInput = { ...card, cardhedge_card_id: cardhedgeId };
        const pricingQuery = buildCardQuery(pricingInput);

        // Shared pricing selection
        if (pricingQuery.trim()) {
          try {
            const pricing = await fetchComps(pricingInput);
            valueCents = pricing.median_cents || pricing.average_cents;
          } catch { /* pricing failed */ }
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

// Vercel Cron sends GET; external schedulers typically use POST. Support both.
export async function GET(request: NextRequest) {
  return runRefresh(request);
}

export async function POST(request: NextRequest) {
  return runRefresh(request);
}
