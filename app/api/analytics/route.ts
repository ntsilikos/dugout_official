import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Card, DashboardStats } from "@/lib/types";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch all cards for the user
  const { data: cards, error } = await supabase
    .from("cards")
    .select("*, card_images(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const allCards = cards || [];

  const totalCards = allCards.length;
  const totalValueCents = allCards.reduce(
    (sum, c) => sum + (c.estimated_value_cents || 0),
    0
  );
  const totalCostCents = allCards.reduce(
    (sum, c) => sum + (c.purchase_price_cents || 0),
    0
  );
  const cardsListed = allCards.filter((c) => c.status === "listed").length;
  const cardsSold = allCards.filter((c) => c.status === "sold").length;

  // Sport breakdown
  const sportMap = new Map<string, { count: number; valueCents: number }>();
  for (const card of allCards) {
    const sport = card.sport || "Unknown";
    const existing = sportMap.get(sport) || { count: 0, valueCents: 0 };
    existing.count++;
    existing.valueCents += card.estimated_value_cents || 0;
    sportMap.set(sport, existing);
  }
  const sportBreakdown = Array.from(sportMap.entries()).map(
    ([sport, data]) => ({ sport, ...data })
  );

  // Recent cards (first 5, already sorted by created_at desc)
  const recentCards = allCards.slice(0, 5) as Card[];

  // Top cards by estimated value (top 5, unsold only)
  const topCards = [...allCards]
    .filter((c) => c.status !== "sold")
    .sort((a, b) => (b.estimated_value_cents || 0) - (a.estimated_value_cents || 0))
    .slice(0, 5) as Card[];

  // Generate signed URLs via admin client and rename card_images -> images
  const admin = createAdminClient();
  const cardsNeedingImages = [...recentCards, ...topCards];
  for (const card of cardsNeedingImages) {
    const cardAny = card as unknown as {
      card_images?: { storage_path: string; is_primary: boolean; url?: string | null }[];
      images?: unknown;
    };
    if (cardAny.card_images) {
      for (const img of cardAny.card_images) {
        if (!img.url) {
          const { data } = await admin.storage
            .from("card-images")
            .createSignedUrl(img.storage_path, 3600);
          img.url = data?.signedUrl || null;
        }
      }
      cardAny.images = cardAny.card_images;
      delete cardAny.card_images;
    }
  }

  // Daily change: compare latest two portfolio snapshots
  let dailyChangeCents: number | null = null;
  const { data: snapshots } = await supabase
    .from("portfolio_snapshots")
    .select("total_value_cents, snapshot_date")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: false })
    .limit(2);

  if (snapshots && snapshots.length >= 2) {
    dailyChangeCents = snapshots[0].total_value_cents - snapshots[1].total_value_cents;
  }

  // Get last appraisal time
  const { data: profile } = await supabase
    .from("profiles")
    .select("last_appraised_at")
    .eq("id", user.id)
    .single();

  // Total revenue — marketplace listings + show sales + sold repacks
  const [listingSalesRes, showSalesRes, repackSalesRes] = await Promise.all([
    supabase
      .from("listings")
      .select("price_cents")
      .eq("user_id", user.id)
      .eq("status", "sold"),
    supabase
      .from("show_sales")
      .select("price_cents")
      .eq("user_id", user.id),
    supabase
      .from("repacks")
      .select("sold_price_cents")
      .eq("user_id", user.id)
      .eq("status", "sold"),
  ]);

  const totalRevenueCents =
    (listingSalesRes.data || []).reduce((s, r) => s + (r.price_cents || 0), 0) +
    (showSalesRes.data || []).reduce((s, r) => s + (r.price_cents || 0), 0) +
    (repackSalesRes.data || []).reduce((s, r) => s + (r.sold_price_cents || 0), 0);

  const repacksSold = (repackSalesRes.data || []).length;

  const stats: DashboardStats & {
    topCards: Card[];
    dailyChangeCents: number | null;
    lastAppraisedAt: string | null;
    totalRevenueCents: number;
    repacksSold: number;
  } = {
    totalCards,
    totalValueCents,
    totalCostCents,
    cardsListed,
    cardsSold,
    sportBreakdown,
    recentCards,
    topCards,
    dailyChangeCents,
    lastAppraisedAt: profile?.last_appraised_at || null,
    totalRevenueCents,
    repacksSold,
  };

  return NextResponse.json(stats);
}
