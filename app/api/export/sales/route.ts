import { withAuth } from "@/lib/api-helpers";
import { toCsv, csvResponse, centsToUsd, isoDate, type CsvColumn } from "@/lib/csv";

/**
 * Sales export: combines marketplace listings (status = sold) AND show_sales.
 * Used for tax records, P&L tracking, consignment reconciliation.
 */

interface SaleRow {
  source: "marketplace" | "show" | "repack";
  sold_at: string;
  marketplace_or_show: string;
  card_name: string;
  sport: string | null;
  grade: string | null;
  sale_price_cents: number;
  purchase_price_cents: number | null;
  profit_cents: number | null;
}

const SOURCE_LABEL: Record<SaleRow["source"], string> = {
  marketplace: "Marketplace",
  show: "Card Show",
  repack: "Repack",
};

const COLUMNS: CsvColumn<SaleRow>[] = [
  { header: "Date", value: (r) => isoDate(r.sold_at) },
  { header: "Source", value: (r) => SOURCE_LABEL[r.source] },
  { header: "Channel", value: (r) => r.marketplace_or_show },
  { header: "Card", value: (r) => r.card_name },
  { header: "Sport", value: (r) => r.sport },
  { header: "Grade", value: (r) => r.grade },
  { header: "Sale Price (USD)", value: (r) => centsToUsd(r.sale_price_cents) },
  { header: "Purchase Price (USD)", value: (r) => centsToUsd(r.purchase_price_cents) },
  { header: "Profit (USD)", value: (r) => centsToUsd(r.profit_cents) },
];

const MP_LABELS: Record<string, string> = { ebay: "eBay", tiktok: "TikTok Shop" };

export async function GET() {
  return withAuth(async (user, supabase) => {
    // Marketplace sales: listings with status=sold
    const { data: listings } = await supabase
      .from("listings")
      .select(
        "marketplace,title,price_cents,sold_at,cards(player_name,sport,grade_company,grade_value,purchase_price_cents)"
      )
      .eq("user_id", user.id)
      .eq("status", "sold")
      .not("sold_at", "is", null);

    // Show sales (physical card-show sales)
    const { data: showSales } = await supabase
      .from("show_sales")
      .select("card_name,price_cents,sold_at,shows(name)")
      .eq("user_id", user.id);

    // Sold repacks
    const { data: soldRepacks } = await supabase
      .from("repacks")
      .select(
        "name,sold_price_cents,sold_at,repack_items(cards(purchase_price_cents))"
      )
      .eq("user_id", user.id)
      .eq("status", "sold")
      .not("sold_at", "is", null);

    const rows: SaleRow[] = [];

    for (const listing of listings || []) {
      const card = (listing as { cards?: { player_name?: string | null; sport?: string | null; grade_company?: string | null; grade_value?: number | null; purchase_price_cents?: number | null } }).cards;
      const purchase = card?.purchase_price_cents ?? null;
      rows.push({
        source: "marketplace",
        sold_at: listing.sold_at as string,
        marketplace_or_show: MP_LABELS[listing.marketplace] || listing.marketplace,
        card_name: listing.title || card?.player_name || "Unknown",
        sport: card?.sport || null,
        grade: card?.grade_value ? `${card.grade_company || ""} ${card.grade_value}`.trim() : null,
        sale_price_cents: listing.price_cents,
        purchase_price_cents: purchase,
        profit_cents: purchase != null ? listing.price_cents - purchase : null,
      });
    }

    for (const sale of showSales || []) {
      const show = (sale as { shows?: { name?: string } }).shows;
      rows.push({
        source: "show",
        sold_at: sale.sold_at as string,
        marketplace_or_show: show?.name || "Card Show",
        card_name: sale.card_name,
        sport: null,
        grade: null,
        sale_price_cents: sale.price_cents,
        purchase_price_cents: null,
        profit_cents: null,
      });
    }

    for (const r of soldRepacks || []) {
      const items =
        ((r as unknown) as {
          repack_items?: { cards?: { purchase_price_cents?: number | null } }[];
        }).repack_items || [];
      const cost = items.reduce(
        (sum, it) => sum + (it.cards?.purchase_price_cents || 0),
        0
      );
      const salePrice = r.sold_price_cents || 0;
      rows.push({
        source: "repack",
        sold_at: r.sold_at as string,
        marketplace_or_show: r.name,
        card_name: `${r.name} (${items.length} card${items.length === 1 ? "" : "s"})`,
        sport: null,
        grade: null,
        sale_price_cents: salePrice,
        purchase_price_cents: cost || null,
        profit_cents: cost > 0 ? salePrice - cost : null,
      });
    }

    // Sort descending by date
    rows.sort((a, b) => (a.sold_at < b.sold_at ? 1 : -1));

    const csv = toCsv(COLUMNS, rows);
    const filename = `dugout-sales-${isoDate(new Date().toISOString())}.csv`;
    return csvResponse(csv, filename);
  });
}
