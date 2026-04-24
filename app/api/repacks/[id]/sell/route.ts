import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

// POST /api/repacks/[id]/sell
// Body: { sold_price_cents: number, sold_at?: string, marketplace?: string }
// - Marks the repack as sold
// - Cascades: marks every card in the repack as sold (status="sold", sold_at set)
// - Creates a notification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const body = await request.json();
    const priceCents = Number(body.sold_price_cents);
    if (!priceCents || priceCents <= 0) {
      return NextResponse.json(
        { error: "sold_price_cents must be a positive number" },
        { status: 400 }
      );
    }
    const soldAt = body.sold_at || new Date().toISOString();

    // Verify repack ownership and not already sold
    const { data: repack } = await supabase
      .from("repacks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!repack) {
      return NextResponse.json({ error: "Repack not found" }, { status: 404 });
    }
    if (repack.status === "sold") {
      return NextResponse.json(
        { error: "Repack is already marked as sold" },
        { status: 400 }
      );
    }

    // Update repack
    const { error: repackErr } = await supabase
      .from("repacks")
      .update({
        status: "sold",
        sold_price_cents: priceCents,
        sold_at: soldAt,
      })
      .eq("id", id);

    if (repackErr) {
      return NextResponse.json({ error: repackErr.message }, { status: 500 });
    }

    // Get all cards in the repack
    const { data: items } = await supabase
      .from("repack_items")
      .select("card_id")
      .eq("repack_id", id);

    const cardIds = (items || []).map((i) => i.card_id);

    // Mark every card in the repack as sold
    if (cardIds.length > 0) {
      await supabase
        .from("cards")
        .update({ status: "sold", sold_at: soldAt })
        .in("id", cardIds)
        .eq("user_id", user.id);
    }

    // Notify the user
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "repack_sold",
      title: `Repack sold: ${repack.name}`,
      body: `You sold "${repack.name}" for $${(priceCents / 100).toFixed(2)}. ${cardIds.length} card${cardIds.length === 1 ? "" : "s"} marked as sold.`,
      link: `/repacks/${id}`,
    });

    return NextResponse.json({
      success: true,
      soldPriceCents: priceCents,
      cardsMarkedSold: cardIds.length,
    });
  });
}
