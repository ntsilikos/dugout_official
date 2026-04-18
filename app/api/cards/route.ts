import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CardListResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const sport = searchParams.get("sport") || "";
  const status = searchParams.get("status") || "";
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") === "asc" ? true : false;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20")));
  const offset = (page - 1) * limit;

  let query = supabase
    .from("cards")
    .select("*, card_images(*)", { count: "exact" })
    .eq("user_id", user.id)
    .order(sort, { ascending: order })
    .range(offset, offset + limit - 1);

  if (q) {
    query = query.or(
      `player_name.ilike.%${q}%,brand.ilike.%${q}%,set_name.ilike.%${q}%,card_number.ilike.%${q}%,notes.ilike.%${q}%`
    );
  }
  if (sport) {
    query = query.eq("sport", sport);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: cards, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Generate signed URLs via admin client (bypasses RLS on private bucket)
  const admin = createAdminClient();
  const cardsWithImages = await Promise.all(
    (cards || []).map(async (card) => {
      const rawImages = (card as unknown as { card_images?: { storage_path: string; is_primary: boolean; id: string; side: string; display_order: number }[] }).card_images || [];
      const images = await Promise.all(
        rawImages.map(async (img) => {
          const { data: urlData } = await admin.storage
            .from("card-images")
            .createSignedUrl(img.storage_path, 3600);
          return { ...img, url: urlData?.signedUrl || null };
        })
      );
      const cardCopy = { ...card, images } as Record<string, unknown>;
      delete cardCopy.card_images;
      return cardCopy;
    })
  );

  const response: CardListResponse = {
    cards: cardsWithImages as unknown as CardListResponse["cards"],
    total: count || 0,
    page,
    limit,
  };

  return NextResponse.json(response);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { data: card, error } = await supabase
    .from("cards")
    .insert({
      user_id: user.id,
      player_name: body.player_name || null,
      year: body.year || null,
      brand: body.brand || null,
      set_name: body.set_name || null,
      card_number: body.card_number || null,
      variant: body.variant || null,
      sport: body.sport || null,
      condition: body.condition || "raw",
      grade_company: body.grade_company || null,
      grade_value: body.grade_value || null,
      grade_label: body.grade_label || null,
      estimated_value_cents: body.estimated_value_cents || null,
      purchase_price_cents: body.purchase_price_cents || null,
      notes: body.notes || null,
      tags: body.tags || [],
      ai_identification: body.ai_identification || null,
      status: body.status || "in_collection",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ card }, { status: 201 });
}
