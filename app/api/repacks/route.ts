import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const { searchParams } = new URL(request.url);
    const tab = searchParams.get("tab") || "active";

    let query = supabase
      .from("repacks")
      .select("*, repack_items(count)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (tab === "templates") {
      query = query.eq("is_template", true);
    } else if (tab === "sold") {
      query = query.eq("status", "sold").eq("is_template", false);
    } else {
      query = query.neq("status", "sold").eq("is_template", false);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ repacks: data || [] });
  });
}

// Enforce logical order of cost targets so the progress bar, alerts, and
// downstream math don't break on nonsensical inputs.
export function validateCostTargets(
  floor: number | null,
  target: number | null,
  ceiling: number | null
): string | null {
  if (floor != null && target != null && floor > target) {
    return "Floor cost can't be higher than target cost.";
  }
  if (target != null && ceiling != null && target > ceiling) {
    return "Target cost can't be higher than ceiling cost.";
  }
  if (floor != null && ceiling != null && floor > ceiling) {
    return "Floor cost can't be higher than ceiling cost.";
  }
  return null;
}

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    const floor = body.floor_cost_cents ?? null;
    const target = body.target_cost_cents ?? null;
    const ceiling = body.ceiling_cost_cents ?? null;
    const costErr = validateCostTargets(floor, target, ceiling);
    if (costErr) {
      return NextResponse.json({ error: costErr }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("repacks")
      .insert({
        user_id: user.id,
        name: body.name,
        description: body.description || null,
        target_items: body.target_items || null,
        target_cost_cents: target,
        ceiling_cost_cents: ceiling,
        floor_cost_cents: floor,
        is_template: body.is_template || false,
        template_id: body.template_id || null,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ repack: data }, { status: 201 });
  });
}
