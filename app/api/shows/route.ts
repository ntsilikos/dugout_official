import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET() {
  return withAuth(async (user, supabase) => {
    const { data, error } = await supabase
      .from("shows")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ shows: data || [] });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const { name, location } = await request.json();

    const { data, error } = await supabase
      .from("shows")
      .insert({
        user_id: user.id,
        name,
        location: location || null,
        status: "active",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ show: data }, { status: 201 });
  });
}
