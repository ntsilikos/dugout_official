import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { searchParams } = new URL(request.url);
    const marketplace = searchParams.get("marketplace") || "";
    const unreadOnly = searchParams.get("unread_only") === "true";

    let query = supabase
      .from("search_results")
      .select("*")
      .eq("search_id", id)
      .eq("user_id", user.id)
      .eq("is_dismissed", false)
      .order("found_at", { ascending: false })
      .limit(100);

    if (marketplace) query = query.eq("marketplace", marketplace);
    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ results: data || [] });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    if (body.mark_all_read) {
      await supabase
        .from("search_results")
        .update({ is_read: true })
        .eq("search_id", id)
        .eq("user_id", user.id);
    } else if (body.result_ids?.length) {
      await supabase
        .from("search_results")
        .update({ is_read: true })
        .in("id", body.result_ids)
        .eq("user_id", user.id);
    } else if (body.dismiss_ids?.length) {
      await supabase
        .from("search_results")
        .update({ is_dismissed: true })
        .in("id", body.dismiss_ids)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  });
}
