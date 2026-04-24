import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

const MAX_SEARCHES = 30;

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("card_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ searches: data || [] });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    // Check limit
    const { count } = await supabase
      .from("card_searches")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if ((count || 0) >= MAX_SEARCHES) {
      return NextResponse.json(
        { error: `Maximum ${MAX_SEARCHES} active searches allowed` },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("card_searches")
      .insert({
        user_id: user.id,
        name: body.name,
        filters: body.filters || {},
        max_price_cents: body.max_price_cents || null,
        marketplaces: body.marketplaces || [],
        target_card_numbers:
          Array.isArray(body.target_card_numbers) && body.target_card_numbers.length > 0
            ? body.target_card_numbers
            : null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ search: data }, { status: 201 });
  });
}
