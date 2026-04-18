import { withAuth } from "@/lib/api-helpers";
import { toCsv, csvResponse, centsToUsd, isoDate, type CsvColumn } from "@/lib/csv";

interface InventoryRow {
  id: string;
  player_name: string | null;
  year: number | null;
  brand: string | null;
  set_name: string | null;
  card_number: string | null;
  variant: string | null;
  sport: string | null;
  condition: string;
  grade_company: string | null;
  grade_value: number | null;
  grade_label: string | null;
  estimated_value_cents: number | null;
  purchase_price_cents: number | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const COLUMNS: CsvColumn<InventoryRow>[] = [
  { header: "ID", value: (r) => r.id },
  { header: "Player", value: (r) => r.player_name },
  { header: "Year", value: (r) => r.year },
  { header: "Brand", value: (r) => r.brand },
  { header: "Set", value: (r) => r.set_name },
  { header: "Card #", value: (r) => r.card_number },
  { header: "Variant", value: (r) => r.variant },
  { header: "Sport", value: (r) => r.sport },
  { header: "Condition", value: (r) => r.condition },
  { header: "Grader", value: (r) => r.grade_company },
  { header: "Grade", value: (r) => r.grade_value },
  { header: "Grade Label", value: (r) => r.grade_label },
  { header: "Estimated Value (USD)", value: (r) => centsToUsd(r.estimated_value_cents) },
  { header: "Purchase Price (USD)", value: (r) => centsToUsd(r.purchase_price_cents) },
  {
    header: "Gain/Loss (USD)",
    value: (r) => {
      if (r.estimated_value_cents == null || r.purchase_price_cents == null) return "";
      return centsToUsd(r.estimated_value_cents - r.purchase_price_cents);
    },
  },
  { header: "Status", value: (r) => r.status },
  { header: "Notes", value: (r) => r.notes },
  { header: "Added", value: (r) => isoDate(r.created_at) },
  { header: "Last Updated", value: (r) => isoDate(r.updated_at) },
];

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data: cards, error } = await supabase
      .from("cards")
      .select("id,player_name,year,brand,set_name,card_number,variant,sport,condition,grade_company,grade_value,grade_label,estimated_value_cents,purchase_price_cents,notes,status,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const csv = toCsv(COLUMNS, (cards || []) as InventoryRow[]);
    const filename = `dugout-inventory-${isoDate(new Date().toISOString())}.csv`;
    return csvResponse(csv, filename);
  });
}
