import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

// GET /api/repacks/available-cards?exclude_repack_id=<id>&q=<search>
//
// Returns cards that are:
// - in_collection (not listed, not sold)
// - NOT currently in any other active (non-sold) repack — prevents overselling
// - Optionally excludes cards already in the current repack being edited
//
// This replaces the generic /api/cards call from the CardPicker so we
// catch the multi-repack conflict server-side.
export async function GET(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const url = new URL(request.url);
    const excludeRepackId = url.searchParams.get("exclude_repack_id");
    const search = url.searchParams.get("q") || "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 200);

    // Get IDs of cards already locked in other ACTIVE repacks
    const { data: busyItems } = await supabase
      .from("repack_items")
      .select("card_id, repack_id, repacks!inner(id,status,is_template)")
      .eq("user_id", user.id);

    const busyCardIds = new Set<string>();
    const repackByCard = new Map<string, { name: string; id: string }>();

    // Also fetch repack metadata for conflict messaging
    const { data: activeRepacks } = await supabase
      .from("repacks")
      .select("id, name, status, is_template")
      .eq("user_id", user.id);

    const repackMeta = new Map(
      (activeRepacks || []).map((r) => [
        r.id,
        { name: r.name, status: r.status, isTemplate: r.is_template },
      ])
    );

    for (const item of busyItems || []) {
      const r = repackMeta.get(item.repack_id);
      // Skip sold repacks and templates — their cards aren't "locked"
      if (!r || r.status === "sold" || r.isTemplate) continue;
      // Skip the repack we're currently editing
      if (excludeRepackId && item.repack_id === excludeRepackId) continue;
      busyCardIds.add(item.card_id);
      if (!repackByCard.has(item.card_id)) {
        repackByCard.set(item.card_id, { name: r.name, id: item.repack_id });
      }
    }

    // Fetch user's in-collection cards
    let query = supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "in_collection")
      .order("created_at", { ascending: false })
      .limit(limit * 2); // over-fetch to leave room after filtering

    if (search.trim()) {
      // Basic text search on common fields
      const s = search.trim();
      query = query.or(
        `player_name.ilike.%${s}%,set_name.ilike.%${s}%,brand.ilike.%${s}%,card_number.ilike.%${s}%`
      );
    }

    const { data: cards, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const available = (cards || [])
      .filter((c) => !busyCardIds.has(c.id))
      .slice(0, limit);

    return NextResponse.json({
      cards: available,
      busyCount: busyCardIds.size,
    });
  });
}
