import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withAuth } from "@/lib/api-helpers";
import { fetchComps } from "@/lib/pricing";
import { PRICING_SYSTEM_PROMPT } from "@/lib/pricing-prompt";
import { getCardTitle } from "@/lib/utils";

const anthropic = new Anthropic();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: card } = await supabase
      .from("cards")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!card) {
      return NextResponse.json({ error: "Card not found" }, { status: 404 });
    }

    // Fetch comps + price estimate from CardHedge
    const comps = await fetchComps(card);

    const cardInfo = `Card: ${getCardTitle(card)}
Sport: ${card.sport || "Unknown"}
Condition: ${card.condition}
Grade: ${card.grade_company || "Ungraded"} ${card.grade_value || ""}
Variant: ${card.variant || "Base"}
Purchase Price: ${card.purchase_price_cents ? `$${(card.purchase_price_cents / 100).toFixed(2)}` : "Unknown"}
Current Estimated Value: ${card.estimated_value_cents ? `$${(card.estimated_value_cents / 100).toFixed(2)}` : "Unknown"}`;

    let compInfo: string;
    if (comps.price_estimate) {
      const est = comps.price_estimate;
      compInfo = `CardHedge price estimate (confidence: ${est.confidence}, method: ${est.method}):
Estimated Price: $${est.price.toFixed(2)}
Price Range: $${est.price_low.toFixed(2)} - $${est.price_high.toFixed(2)}
Grade: ${est.grade_label}
Data Freshness: ${est.freshness_days} days old`;

      if (comps.count > 0) {
        compInfo += `\n\nComparable sales data (${comps.count} comps):
Average Comp: $${(comps.average_cents / 100).toFixed(2)}
Range: $${(comps.low_cents / 100).toFixed(2)} - $${(comps.high_cents / 100).toFixed(2)}`;
      }

      if (comps.cardhedge_match?.prices?.length) {
        compInfo += `\n\nPrices by grade:`;
        for (const p of comps.cardhedge_match.prices) {
          compInfo += `\n- ${p.grade}: $${parseFloat(p.price).toFixed(2)}`;
        }
      }
    } else if (comps.count > 0) {
      compInfo = `Comparable sales data (${comps.count} found):
Average: $${(comps.average_cents / 100).toFixed(2)}
Range: $${(comps.low_cents / 100).toFixed(2)} - $${(comps.high_cents / 100).toFixed(2)}`;
    } else if (card.estimated_value_cents) {
      compInfo = `No comparable sales data available. The card's current estimated value is $${(card.estimated_value_cents / 100).toFixed(2)}. Use this as your primary anchor and stay within 25% of it.`;
    } else {
      compInfo = `No comparable sales data available and no estimated value set. Provide a conservative estimate based on the card details. Set confidence to "low".`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      temperature: 0.2,
      system: PRICING_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this card and recommend a listing price:\n\n${cardInfo}\n\n${compInfo}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    const advice = JSON.parse(textBlock.text);
    return NextResponse.json({ advice, comps });
  });
}
