import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async (user, supabase) => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("portfolio_snapshots")
      .select("*")
      .eq("user_id", user.id)
      .gte("snapshot_date", ninetyDaysAgo)
      .order("snapshot_date", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ snapshots: data || [] });
  });
}
