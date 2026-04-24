import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron-auth";

async function runSnapshot(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get all users with cards
  const { data: users } = await supabase
    .from("cards")
    .select("user_id")
    .neq("status", "sold");

  const userIds = [...new Set((users || []).map((u) => u.user_id))];
  let snapped = 0;

  for (const userId of userIds) {
    const { data: cards } = await supabase
      .from("cards")
      .select("estimated_value_cents")
      .eq("user_id", userId)
      .neq("status", "sold");

    const totalValue = (cards || []).reduce(
      (sum, c) => sum + (c.estimated_value_cents || 0),
      0
    );

    await supabase.from("portfolio_snapshots").upsert(
      {
        user_id: userId,
        total_value_cents: totalValue,
        card_count: cards?.length || 0,
        snapshot_date: new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id,snapshot_date" }
    );
    snapped++;
  }

  return NextResponse.json({ snapped });
}

// Vercel Cron sends GET; external schedulers typically use POST. Support both.
export async function GET(request: NextRequest) {
  return runSnapshot(request);
}

export async function POST(request: NextRequest) {
  return runSnapshot(request);
}
