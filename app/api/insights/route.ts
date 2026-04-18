import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("collection_insights")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insights: data || [] });
  });
}
