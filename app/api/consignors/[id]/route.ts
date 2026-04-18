import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: consignor } = await supabase
      .from("consignors")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!consignor) {
      return NextResponse.json({ error: "Consignor not found" }, { status: 404 });
    }

    const { data: items } = await supabase
      .from("consignment_items")
      .select("*, cards(*)")
      .eq("consignor_id", id)
      .order("added_at", { ascending: false });

    const { data: payouts } = await supabase
      .from("payouts")
      .select("*")
      .eq("consignor_id", id)
      .order("paid_at", { ascending: false });

    return NextResponse.json({
      consignor,
      items: items || [],
      payouts: payouts || [],
    });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    await supabase.from("consignors").delete().eq("id", id).eq("user_id", user.id);
    return NextResponse.json({ success: true });
  });
}
