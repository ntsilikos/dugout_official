import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("marketplace_connections")
      .select("id, marketplace, marketplace_username, is_active, connected_at")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connections: data || [] });
  });
}

export async function DELETE(request: Request) {
  return withAuth(async (user, supabase) => {
    const { marketplace } = await request.json();

    await supabase
      .from("marketplace_connections")
      .update({ is_active: false, access_token: null, refresh_token: null })
      .eq("user_id", user.id)
      .eq("marketplace", marketplace);

    return NextResponse.json({ success: true });
  });
}
