import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: set } = await supabase
      .from("card_sets")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!set) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    const { data: cards } = await supabase
      .from("set_cards")
      .select("*")
      .eq("set_id", id)
      .order("card_number", { ascending: true });

    return NextResponse.json({ set, cards: cards || [] });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    await supabase.from("card_sets").delete().eq("id", id).eq("user_id", user.id);
    return NextResponse.json({ success: true });
  });
}
