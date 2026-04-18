import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data: consignors } = await supabase
      .from("consignors")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Get stats for each consignor
    const enriched = [];
    for (const c of consignors || []) {
      const { count: activeCards } = await supabase
        .from("consignment_items")
        .select("*", { count: "exact", head: true })
        .eq("consignor_id", c.id)
        .eq("status", "active");

      const { data: payoutData } = await supabase
        .from("payouts")
        .select("amount_cents")
        .eq("consignor_id", c.id);

      const totalPaid = (payoutData || []).reduce((sum, p) => sum + p.amount_cents, 0);

      enriched.push({
        ...c,
        active_cards: activeCards || 0,
        total_paid_cents: totalPaid,
      });
    }

    return NextResponse.json({ consignors: enriched });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    const { data, error } = await supabase
      .from("consignors")
      .insert({
        user_id: user.id,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        commission_rate: body.commission_rate || 15,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ consignor: data }, { status: 201 });
  });
}
