import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data: sets } = await supabase
      .from("card_sets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Get owned counts for each set
    const setsWithCounts = [];
    for (const set of sets || []) {
      const { count } = await supabase
        .from("set_cards")
        .select("*", { count: "exact", head: true })
        .eq("set_id", set.id)
        .eq("is_owned", true);

      setsWithCounts.push({ ...set, owned_count: count || 0 });
    }

    return NextResponse.json({ sets: setsWithCounts });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    const { data, error } = await supabase
      .from("card_sets")
      .insert({
        user_id: user.id,
        name: body.name,
        year: body.year || null,
        brand: body.brand || null,
        sport: body.sport || null,
        total_cards: body.total_cards || 0,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ set: data }, { status: 201 });
  });
}
