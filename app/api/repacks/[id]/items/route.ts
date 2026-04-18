import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: repackId } = await params;
  return withAuth(async (user, supabase) => {
    const { card_ids } = await request.json();

    if (!card_ids?.length) {
      return NextResponse.json({ error: "card_ids required" }, { status: 400 });
    }

    // Verify repack belongs to user
    const { data: repack } = await supabase
      .from("repacks")
      .select("id")
      .eq("id", repackId)
      .eq("user_id", user.id)
      .single();

    if (!repack) {
      return NextResponse.json({ error: "Repack not found" }, { status: 404 });
    }

    // Insert items
    const items = (card_ids as string[]).map((card_id) => ({
      repack_id: repackId,
      card_id,
    }));

    const { error } = await supabase
      .from("repack_items")
      .upsert(items, { onConflict: "repack_id,card_id", ignoreDuplicates: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, added: card_ids.length });
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: repackId } = await params;
  return withAuth(async (user, supabase) => {
    const { card_id } = await request.json();

    // Verify repack belongs to user
    const { data: repack } = await supabase
      .from("repacks")
      .select("id")
      .eq("id", repackId)
      .eq("user_id", user.id)
      .single();

    if (!repack) {
      return NextResponse.json({ error: "Repack not found" }, { status: 404 });
    }

    await supabase
      .from("repack_items")
      .delete()
      .eq("repack_id", repackId)
      .eq("card_id", card_id);

    return NextResponse.json({ success: true });
  });
}
