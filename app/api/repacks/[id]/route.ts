import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateCostTargets } from "@/app/api/repacks/route";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: repack } = await supabase
      .from("repacks")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!repack) {
      return NextResponse.json({ error: "Repack not found" }, { status: 404 });
    }

    // Get items with card details and images
    const { data: items } = await supabase
      .from("repack_items")
      .select("*, cards(*, card_images(*))")
      .eq("repack_id", id)
      .order("added_at", { ascending: true });

    // Generate signed URLs via admin client (private bucket)
    const admin = createAdminClient();
    for (const item of items || []) {
      if (item.cards?.card_images) {
        for (const img of item.cards.card_images) {
          const { data } = await admin.storage
            .from("card-images")
            .createSignedUrl(img.storage_path, 3600);
          img.url = data?.signedUrl || null;
        }
      }
    }

    return NextResponse.json({ repack, items: items || [] });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    // If any cost target is being updated, validate the full set against the
    // existing row so you can't e.g. set ceiling below the current floor.
    const costFields = ["floor_cost_cents", "target_cost_cents", "ceiling_cost_cents"];
    if (costFields.some((f) => f in body)) {
      const { data: current } = await supabase
        .from("repacks")
        .select("floor_cost_cents,target_cost_cents,ceiling_cost_cents")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();
      const floor = "floor_cost_cents" in body
        ? body.floor_cost_cents
        : (current?.floor_cost_cents ?? null);
      const target = "target_cost_cents" in body
        ? body.target_cost_cents
        : (current?.target_cost_cents ?? null);
      const ceiling = "ceiling_cost_cents" in body
        ? body.ceiling_cost_cents
        : (current?.ceiling_cost_cents ?? null);
      const costErr = validateCostTargets(floor, target, ceiling);
      if (costErr) {
        return NextResponse.json({ error: costErr }, { status: 400 });
      }
    }

    const { data, error } = await supabase
      .from("repacks")
      .update(body)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ repack: data });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    await supabase
      .from("repacks")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  });
}
