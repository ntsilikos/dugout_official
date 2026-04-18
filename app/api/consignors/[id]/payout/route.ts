import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: consignorId } = await params;
  return withAuth(async (user, supabase) => {
    const { amount_cents, notes } = await request.json();

    if (!amount_cents || amount_cents <= 0) {
      return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("payouts")
      .insert({
        consignor_id: consignorId,
        user_id: user.id,
        amount_cents,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payout: data }, { status: 201 });
  });
}
