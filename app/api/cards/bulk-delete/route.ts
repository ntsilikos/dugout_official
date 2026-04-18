import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array is required" },
        { status: 400 }
      );
    }

    if (ids.length > 500) {
      return NextResponse.json(
        { error: "Maximum 500 cards per bulk delete" },
        { status: 400 }
      );
    }

    // Get storage paths for these cards' images so we can clean storage too
    const { data: imgs } = await supabase
      .from("card_images")
      .select("storage_path")
      .in("card_id", ids)
      .eq("user_id", user.id);

    // Delete cards (cascades to card_images, card_grades via FK)
    const { error, count } = await supabase
      .from("cards")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Best-effort: remove image files from storage via admin client
    if (imgs && imgs.length > 0) {
      const admin = createAdminClient();
      const paths = imgs.map((i) => i.storage_path);
      await admin.storage.from("card-images").remove(paths).catch(() => {});
    }

    return NextResponse.json({ deleted: count || 0 });
  });
}
