import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

interface ImportRow {
  player_name?: string;
  year?: number;
  brand?: string;
  set_name?: string;
  card_number?: string;
  variant?: string;
  sport?: string;
  condition?: string;
  grade_company?: string;
  grade_value?: number;
  estimated_value_cents?: number;
  purchase_price_cents?: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const { rows } = (await request.json()) as { rows: ImportRow[] };

    if (!rows?.length) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 cards per import" },
        { status: 400 }
      );
    }

    const cards = rows.map((row) => ({
      user_id: user.id,
      player_name: row.player_name || null,
      year: row.year || null,
      brand: row.brand || null,
      set_name: row.set_name || null,
      card_number: row.card_number || null,
      variant: row.variant || null,
      sport: row.sport || null,
      condition: row.condition === "graded" ? "graded" : "raw",
      grade_company: row.grade_company || null,
      grade_value: row.grade_value || null,
      estimated_value_cents: row.estimated_value_cents || null,
      purchase_price_cents: row.purchase_price_cents || null,
      notes: row.notes || null,
      status: "in_collection",
    }));

    const { data, error } = await supabase
      .from("cards")
      .insert(cards)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { imported: data?.length || 0 },
      { status: 201 }
    );
  });
}
