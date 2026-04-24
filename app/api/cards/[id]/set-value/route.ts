import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/cards/[id]/set-value
//
// Lets the user manually pick a price from the Market Price Checker
// (either a summary stat like "Comp Avg" or an individual listing) and
// commit it to the card's estimated_value_cents.
//
// Marks the card as "verified" because a user actively chose this value
// — a much stronger trust signal than our algorithmic match. Clears any
// existing flag reason so the card drops out of the Needs Review queue.
//
// Gracefully degrades if the appraisal columns haven't been migrated yet:
// will still update estimated_value_cents, just without the provenance
// tracking.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const valueCents = Number(body?.valueCents);

  if (!Number.isFinite(valueCents) || valueCents < 0) {
    return NextResponse.json(
      { error: "valueCents must be a non-negative number" },
      { status: 400 }
    );
  }

  const rounded = Math.round(valueCents);
  const valueOnlyUpdate = { estimated_value_cents: rounded };

  const fullUpdate = {
    ...valueOnlyUpdate,
    appraisal_status: "verified" as const,
    appraisal_confidence: 1.0,
    appraisal_flag_reason: null,
    last_appraised_at: new Date().toISOString(),
  };

  // Try with the full provenance update first
  const { data: card, error } = await supabase
    .from("cards")
    .update(fullUpdate)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  // Detect "column not found" errors (migration hasn't been run)
  if (error) {
    const isMissingColumn =
      /column .* does not exist/i.test(error.message) ||
      error.code === "PGRST204" ||
      error.code === "42703";

    if (isMissingColumn) {
      const { data: fallback, error: fallbackErr } = await supabase
        .from("cards")
        .update(valueOnlyUpdate)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (fallbackErr) {
        return NextResponse.json(
          { error: fallbackErr.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ card: fallback });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  return NextResponse.json({ card });
}
