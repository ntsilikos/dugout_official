import { withAuth } from "@/lib/api-helpers";
import { toCsv, csvResponse, centsToUsd, isoDate, type CsvColumn } from "@/lib/csv";

interface ListingRow {
  id: string;
  marketplace: string;
  marketplace_listing_id: string | null;
  marketplace_url: string | null;
  status: string;
  title: string;
  price_cents: number;
  listed_at: string | null;
  sold_at: string | null;
  created_at: string;
  error_message: string | null;
  cards: {
    player_name: string | null;
    year: number | null;
    brand: string | null;
    set_name: string | null;
    sport: string | null;
    grade_company: string | null;
    grade_value: number | null;
    purchase_price_cents: number | null;
  } | null;
}

const MP_LABELS: Record<string, string> = { ebay: "eBay", tiktok: "TikTok Shop" };

const COLUMNS: CsvColumn<ListingRow>[] = [
  { header: "Listing ID", value: (r) => r.id },
  { header: "Marketplace", value: (r) => MP_LABELS[r.marketplace] || r.marketplace },
  { header: "Marketplace Listing ID", value: (r) => r.marketplace_listing_id },
  { header: "Title", value: (r) => r.title },
  { header: "Player", value: (r) => r.cards?.player_name },
  { header: "Year", value: (r) => r.cards?.year },
  { header: "Brand", value: (r) => r.cards?.brand },
  { header: "Set", value: (r) => r.cards?.set_name },
  { header: "Sport", value: (r) => r.cards?.sport },
  { header: "Grader", value: (r) => r.cards?.grade_company },
  { header: "Grade", value: (r) => r.cards?.grade_value },
  { header: "List Price (USD)", value: (r) => centsToUsd(r.price_cents) },
  { header: "Purchase Price (USD)", value: (r) => centsToUsd(r.cards?.purchase_price_cents) },
  {
    header: "Profit if Sold (USD)",
    value: (r) => {
      if (r.cards?.purchase_price_cents == null) return "";
      return centsToUsd(r.price_cents - r.cards.purchase_price_cents);
    },
  },
  { header: "Status", value: (r) => r.status },
  { header: "Listed At", value: (r) => isoDate(r.listed_at) },
  { header: "Sold At", value: (r) => isoDate(r.sold_at) },
  { header: "URL", value: (r) => r.marketplace_url },
  { header: "Error", value: (r) => r.error_message },
];

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,marketplace,marketplace_listing_id,marketplace_url,status,title,price_cents,listed_at,sold_at,created_at,error_message,cards(player_name,year,brand,set_name,sport,grade_company,grade_value,purchase_price_cents)"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const csv = toCsv(COLUMNS, (data || []) as unknown as ListingRow[]);
    const filename = `dugout-listings-${isoDate(new Date().toISOString())}.csv`;
    return csvResponse(csv, filename);
  });
}
