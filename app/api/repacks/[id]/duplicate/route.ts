import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: templateId } = await params;
  return withAuth(async (user, supabase) => {
    // Get template
    const { data: template } = await supabase
      .from("repacks")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Create new repack from template
    const { data: repack, error } = await supabase
      .from("repacks")
      .insert({
        user_id: user.id,
        name: `${template.name} (Copy)`,
        description: template.description,
        target_items: template.target_items,
        target_cost_cents: template.target_cost_cents,
        ceiling_cost_cents: template.ceiling_cost_cents,
        floor_cost_cents: template.floor_cost_cents,
        is_template: false,
        template_id: templateId,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ repack }, { status: 201 });
  });
}
