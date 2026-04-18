import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: cardId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify card belongs to user
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (!card) {
    return NextResponse.json({ error: "Card not found" }, { status: 404 });
  }

  const body = await request.json();
  const { image, mediaType, side } = body;

  if (!image || !mediaType) {
    return NextResponse.json(
      { error: "Image and media type are required" },
      { status: 400 }
    );
  }

  // Use admin client for storage operations (bucket has no user-level RLS policies)
  const admin = createAdminClient();

  // Decode base64 and upload to Supabase Storage
  const buffer = Buffer.from(image, "base64");
  const ext = mediaType.split("/")[1] || "jpg";
  const filename = `${Date.now()}.${ext}`;
  const storagePath = `${user.id}/${cardId}/${filename}`;

  const { error: uploadError } = await admin.storage
    .from("card-images")
    .upload(storagePath, buffer, { contentType: mediaType });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Check if this is the first image (make it primary)
  const { count } = await supabase
    .from("card_images")
    .select("*", { count: "exact", head: true })
    .eq("card_id", cardId);

  const { data: cardImage, error: dbError } = await supabase
    .from("card_images")
    .insert({
      card_id: cardId,
      user_id: user.id,
      storage_path: storagePath,
      display_order: count || 0,
      is_primary: (count || 0) === 0,
      side: side || "front",
    })
    .select()
    .single();

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // Generate signed URL via admin
  const { data: urlData } = await admin.storage
    .from("card-images")
    .createSignedUrl(storagePath, 3600);

  return NextResponse.json(
    { image: { ...cardImage, url: urlData?.signedUrl } },
    { status: 201 }
  );
}
