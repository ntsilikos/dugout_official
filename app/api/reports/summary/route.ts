import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

interface SaleAgg {
  sale_price_cents: number;
  purchase_price_cents: number | null;
  marketplace: string;
  sold_at: string;
}

export async function GET() {
  return withAuth(async (user, supabase) => {
    // Inventory aggregates
    const { data: cards } = await supabase
      .from("cards")
      .select("estimated_value_cents,purchase_price_cents,status,sport")
      .eq("user_id", user.id);

    const allCards = cards || [];
    const inCollection = allCards.filter((c) => c.status === "in_collection");
    const listed = allCards.filter((c) => c.status === "listed");
    const sold = allCards.filter((c) => c.status === "sold");

    const inventoryValueCents = [...inCollection, ...listed].reduce(
      (s, c) => s + (c.estimated_value_cents || 0),
      0
    );
    const totalCostCents = allCards.reduce((s, c) => s + (c.purchase_price_cents || 0), 0);

    // Sales — combine marketplace + show sales
    const { data: mpSales } = await supabase
      .from("listings")
      .select(
        "price_cents,marketplace,sold_at,cards(purchase_price_cents)"
      )
      .eq("user_id", user.id)
      .eq("status", "sold")
      .not("sold_at", "is", null);

    const { data: showSalesRows } = await supabase
      .from("show_sales")
      .select("price_cents,sold_at")
      .eq("user_id", user.id);

    // Sold repacks — revenue + cost basis (sum of cards' purchase prices)
    const { data: soldRepacks } = await supabase
      .from("repacks")
      .select(
        "sold_price_cents,sold_at,repack_items(cards(purchase_price_cents))"
      )
      .eq("user_id", user.id)
      .eq("status", "sold")
      .not("sold_at", "is", null);

    const saleEntries: SaleAgg[] = [];
    for (const s of mpSales || []) {
      const card = (s as { cards?: { purchase_price_cents?: number | null } }).cards;
      saleEntries.push({
        sale_price_cents: s.price_cents,
        purchase_price_cents: card?.purchase_price_cents ?? null,
        marketplace: s.marketplace,
        sold_at: s.sold_at as string,
      });
    }
    for (const s of showSalesRows || []) {
      saleEntries.push({
        sale_price_cents: s.price_cents,
        purchase_price_cents: null,
        marketplace: "show",
        sold_at: s.sold_at as string,
      });
    }
    for (const r of soldRepacks || []) {
      // Sum purchase prices of all cards in the repack
      const items = ((r as unknown) as {
        repack_items?: { cards?: { purchase_price_cents?: number | null } }[];
      }).repack_items || [];
      const costBasis = items.reduce(
        (sum, it) => sum + (it.cards?.purchase_price_cents || 0),
        0
      );
      saleEntries.push({
        sale_price_cents: r.sold_price_cents || 0,
        purchase_price_cents: costBasis,
        marketplace: "repack",
        sold_at: r.sold_at as string,
      });
    }

    const totalRevenueCents = saleEntries.reduce((s, r) => s + r.sale_price_cents, 0);
    const soldCost = saleEntries.reduce(
      (s, r) => s + (r.purchase_price_cents || 0),
      0
    );
    const totalProfitCents = totalRevenueCents - soldCost;

    // Sales by marketplace
    const byMarketplace: Record<string, { count: number; revenue_cents: number }> = {};
    for (const s of saleEntries) {
      const key = s.marketplace;
      if (!byMarketplace[key]) byMarketplace[key] = { count: 0, revenue_cents: 0 };
      byMarketplace[key].count++;
      byMarketplace[key].revenue_cents += s.sale_price_cents;
    }

    // Revenue last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const recent = saleEntries.filter((s) => s.sold_at >= thirtyDaysAgo);
    const revenue30dCents = recent.reduce((s, r) => s + r.sale_price_cents, 0);

    // Inventory by sport
    const sportMap: Record<string, { count: number; valueCents: number }> = {};
    for (const c of allCards) {
      const sport = c.sport || "Unknown";
      if (!sportMap[sport]) sportMap[sport] = { count: 0, valueCents: 0 };
      sportMap[sport].count++;
      sportMap[sport].valueCents += c.estimated_value_cents || 0;
    }
    const sportBreakdown = Object.entries(sportMap).map(([sport, v]) => ({
      sport,
      ...v,
    }));

    return NextResponse.json({
      totalCards: allCards.length,
      inCollectionCount: inCollection.length,
      listedCount: listed.length,
      soldCount: sold.length,
      inventoryValueCents,
      totalCostCents,
      totalRevenueCents,
      totalProfitCents,
      revenue30dCents,
      salesCount: saleEntries.length,
      sales30dCount: recent.length,
      byMarketplace,
      sportBreakdown,
    });
  });
}
