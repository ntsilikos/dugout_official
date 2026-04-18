import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withAuth } from "@/lib/api-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTHENTICITY_SYSTEM_PROMPT } from "@/lib/authenticity-prompt";

const anthropic = new Anthropic();

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    // Get card with images
    const { data: card } = await supabase
      .from("cards")
      .select("*, card_images(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const primaryImage = card.card_images?.find(
      (img: { is_primary: boolean }) => img.is_primary
    );
    if (!primaryImage) {
      return NextResponse.json(
        { error: "No image available for this card" },
        { status: 400 }
      );
    }

    // Get signed URL via admin client (private bucket)
    const admin = createAdminClient();
    const { data: urlData } = await admin.storage
      .from("card-images")
      .createSignedUrl(primaryImage.storage_path, 3600);

    if (!urlData?.signedUrl) {
      return NextResponse.json({ error: "Failed to access image" }, { status: 500 });
    }

    const imgResponse = await fetch(urlData.signedUrl);
    const imgBuffer = await imgResponse.arrayBuffer();
    const base64 = Buffer.from(imgBuffer).toString("base64");
    const mediaType = imgResponse.headers.get("content-type") || "image/jpeg";

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: AUTHENTICITY_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: "Analyze this sports card for authenticity. Check for trimming, counterfeiting, re-coloring, and other alterations.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const result = JSON.parse(textBlock.text);
    return NextResponse.json(result);
  });
}
