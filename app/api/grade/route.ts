import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GRADING_SYSTEM_PROMPT } from "@/lib/grading-prompt";
import type { GradeResult, GradeResponse } from "@/lib/types";

const anthropic = new Anthropic();

const VALID_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

export async function POST(request: NextRequest): Promise<NextResponse<GradeResponse>> {
  try {
    const { image, mediaType } = await request.json();

    if (!image || !mediaType) {
      return NextResponse.json(
        { success: false, error: "Image and media type are required" },
        { status: 400 }
      );
    }

    if (!VALID_MEDIA_TYPES.includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: "Invalid image type. Use JPEG, PNG, WebP, or GIF." },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: GRADING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: image,
              },
            },
            {
              type: "text",
              text: "Please grade this sports card based on the image provided. Return your assessment as a JSON object.",
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { success: false, error: "No text response from AI" },
        { status: 500 }
      );
    }

    const result: GradeResult = JSON.parse(textBlock.text);

    return NextResponse.json({ success: true, result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
