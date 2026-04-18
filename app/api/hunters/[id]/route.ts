import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: search } = await supabase
      .from("card_searches")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!search) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }

    const { data: results } = await supabase
      .from("search_results")
      .select("*")
      .eq("search_id", id)
      .eq("is_dismissed", false)
      .order("found_at", { ascending: false })
      .limit(50);

    return NextResponse.json({ search, results: results || [] });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    const { data, error } = await supabase
      .from("card_searches")
      .update({
        ...(body.name !== undefined && { name: body.name }),
        ...(body.filters !== undefined && { filters: body.filters }),
        ...(body.is_active !== undefined && { is_active: body.is_active }),
        ...(body.max_price_cents !== undefined && { max_price_cents: body.max_price_cents }),
        ...(body.marketplaces !== undefined && { marketplaces: body.marketplaces }),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ search: data });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    await supabase
      .from("card_searches")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  });
}
