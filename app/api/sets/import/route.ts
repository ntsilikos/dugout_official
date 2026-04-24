import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { isCardHedgeConfigured } from "@/lib/config";

interface CardHedgeCard {
  card_id: string;
  description: string;
  player: string;
  set: string;
  number: string;
  variant: string;
  image?: string;
  category?: string;
}

const MAX_CARDS_PER_SET = 500; // hard cap to prevent runaway imports
const PAGE_SIZE = 100;

// POST /api/sets/import
// Body: { name, year, brand, sport, cardhedge_set_name }
// Creates a card_set and bulk-inserts a checklist by fetching cards from
// CardHedge for the given set, deduping by (number, variant=Base preferred).
export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    if (!isCardHedgeConfigured()) {
      return NextResponse.json(
        { error: "CardHedge not configured" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, year, brand, sport, cardhedge_set_name } = body;
    const setNameForSearch = cardhedge_set_name || name;

    if (!name || !setNameForSearch) {
      return NextResponse.json(
        { error: "Set name is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.CARDHEDGE_API_KEY!;

    // Fetch cards in pages, dedupe by number — prefer Base variant per number
    // so a single number isn't represented by 5 parallels.
    const byNumber = new Map<string, CardHedgeCard>();
    let page = 1;
    let totalAvailable = 0;
    let fetchedCount = 0;

    while (byNumber.size < MAX_CARDS_PER_SET && page <= 5) {
      try {
        const res = await fetch(
          "https://api.cardhedger.com/v1/cards/card-search",
          {
            method: "POST",
            headers: {
              "X-API-Key": apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              set: setNameForSearch,
              page_size: PAGE_SIZE,
              page,
            }),
          }
        );

        if (!res.ok) break;

        const data = await res.json();
        const cards: CardHedgeCard[] = data.cards || [];
        if (page === 1) totalAvailable = data.count || 0;
        if (cards.length === 0) break;
        fetchedCount += cards.length;

        for (const card of cards) {
          const num = (card.number || "").trim();
          if (!num) continue;

          const existing = byNumber.get(num);
          // Prefer base variant — overwrite a non-base entry if we find a Base
          if (!existing) {
            byNumber.set(num, card);
          } else if (
            existing.variant !== "Base" &&
            card.variant === "Base"
          ) {
            byNumber.set(num, card);
          }

          if (byNumber.size >= MAX_CARDS_PER_SET) break;
        }
        page++;
      } catch {
        break;
      }
    }

    if (byNumber.size === 0) {
      return NextResponse.json(
        {
          error: "no_cards_found",
          message: `CardHedge returned no cards for set "${setNameForSearch}". Try a different set name or use manual entry.`,
        },
        { status: 404 }
      );
    }

    // Create the set
    const { data: createdSet, error: createErr } = await supabase
      .from("card_sets")
      .insert({
        user_id: user.id,
        name,
        year: year || null,
        brand: brand || null,
        sport: sport || null,
        total_cards: byNumber.size,
      })
      .select()
      .single();

    if (createErr || !createdSet) {
      return NextResponse.json(
        { error: createErr?.message || "Failed to create set" },
        { status: 500 }
      );
    }

    // Bulk-insert the checklist
    const checklistRows = Array.from(byNumber.values()).map((c) => ({
      set_id: createdSet.id,
      user_id: user.id,
      card_number: c.number,
      card_name: c.player || c.description,
      is_owned: false,
    }));

    const { error: insertErr } = await supabase
      .from("set_cards")
      .insert(checklistRows);

    if (insertErr) {
      // Roll back the set if checklist insert failed
      await supabase.from("card_sets").delete().eq("id", createdSet.id);
      return NextResponse.json(
        { error: `Checklist import failed: ${insertErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        set: { ...createdSet, owned_count: 0 },
        imported: byNumber.size,
        totalAvailable,
        fetchedCount,
        truncated: byNumber.size >= MAX_CARDS_PER_SET,
      },
      { status: 201 }
    );
  });
}
