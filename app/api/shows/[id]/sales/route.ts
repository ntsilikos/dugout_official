import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("show_sales")
      .select("*")
      .eq("show_id", id)
      .eq("user_id", user.id)
      .order("sold_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get show details
    const { data: show } = await supabase
      .from("shows")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({ show, sales: data || [] });
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { card_name, price_cents, card_id } = await request.json();

    const { data, error } = await supabase
      .from("show_sales")
      .insert({
        show_id: id,
        user_id: user.id,
        card_name,
        price_cents,
        card_id: card_id || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mark card as sold if linked
    if (card_id) {
      await supabase
        .from("cards")
        .update({ status: "sold" })
        .eq("id", card_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ sale: data }, { status: 201 });
  });
}
