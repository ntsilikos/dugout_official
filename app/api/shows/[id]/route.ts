import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: show } = await supabase
      .from("shows")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!show) {
      return NextResponse.json({ error: "Show not found" }, { status: 404 });
    }

    return NextResponse.json({ show });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    const { data, error } = await supabase
      .from("shows")
      .update({
        ...(body.status && { status: body.status }),
        ...(body.status === "ended" && { ended_at: new Date().toISOString() }),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ show: data });
  });
}
