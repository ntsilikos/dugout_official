import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread_only") === "true";

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (unreadOnly) query = query.eq("is_read", false);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    return NextResponse.json({
      notifications: data || [],
      unreadCount: count || 0,
    });
  });
}

export async function PATCH(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    if (body.mark_all_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
    } else if (body.ids?.length) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", body.ids)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  });
}
