import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: setId } = await params;
  return withAuth(async (user, supabase) => {
    const { cards } = await request.json();

    if (!cards?.length) {
      return NextResponse.json({ error: "cards array required" }, { status: 400 });
    }

    const rows = (cards as { card_number: string; card_name?: string }[]).map((c) => ({
      set_id: setId,
      user_id: user.id,
      card_number: c.card_number,
      card_name: c.card_name || null,
      is_owned: false,
    }));

    const { error } = await supabase.from("set_cards").insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ added: rows.length }, { status: 201 });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: setId } = await params;
  void setId;
  return withAuth(async (user, supabase) => {
    const { card_id: setCardId, is_owned, inventory_card_id } = await request.json();

    const update: Record<string, unknown> = {};
    if (is_owned !== undefined) update.is_owned = is_owned;
    if (inventory_card_id !== undefined) update.card_id = inventory_card_id;

    const { error } = await supabase
      .from("set_cards")
      .update(update)
      .eq("id", setCardId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  });
}
