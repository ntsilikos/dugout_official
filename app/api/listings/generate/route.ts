import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { LISTING_SYSTEM_PROMPT } from "@/lib/listing-prompt";
import { withAuth } from "@/lib/api-helpers";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const { card_id } = await request.json();

    const { data: card } = await supabase
      .from("cards")
      .select("*")
      .eq("id", card_id)
      .eq("user_id", user.id)
      .single();

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    const cardInfo = [
      card.year && `Year: ${card.year}`,
      card.brand && `Brand: ${card.brand}`,
      card.set_name && `Set: ${card.set_name}`,
      card.player_name && `Player: ${card.player_name}`,
      card.card_number && `Card #: ${card.card_number}`,
      card.variant && `Variant: ${card.variant}`,
      card.sport && `Sport: ${card.sport}`,
      card.condition && `Condition: ${card.condition}`,
      card.grade_company && `Grader: ${card.grade_company}`,
      card.grade_value && `Grade: ${card.grade_value}`,
      card.grade_label && `Grade Label: ${card.grade_label}`,
    ]
      .filter(Boolean)
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: LISTING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate an eBay listing title and description for this card:\n\n${cardInfo}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    const result = JSON.parse(textBlock.text);
    return NextResponse.json({ title: result.title, description: result.description });
  });
}
