import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withAuth } from "@/lib/api-helpers";
import { INSIGHTS_SYSTEM_PROMPT } from "@/lib/insights-prompt";
import { formatCurrency } from "@/lib/utils";

const anthropic = new Anthropic();

export async function POST() {
  return withAuth(async (user, supabase) => {
    // Fetch collection data
    const { data: cards } = await supabase
      .from("cards")
      .select("*")
      .eq("user_id", user.id);

    if (!cards?.length) {
      return NextResponse.json({ error: "No cards in collection" }, { status: 400 });
    }

    const totalValue = cards.reduce((sum, c) => sum + (c.estimated_value_cents || 0), 0);
    const totalCost = cards.reduce((sum, c) => sum + (c.purchase_price_cents || 0), 0);
    const sportCounts: Record<string, number> = {};
    cards.forEach((c) => {
      const sport = c.sport || "Unknown";
      sportCounts[sport] = (sportCounts[sport] || 0) + 1;
    });

    const topCards = [...cards]
      .sort((a, b) => (b.estimated_value_cents || 0) - (a.estimated_value_cents || 0))
      .slice(0, 5);

    const portfolioSummary = `Collection Overview:
- Total cards: ${cards.length}
- Total estimated value: ${formatCurrency(totalValue)}
- Total purchase cost: ${formatCurrency(totalCost)}
- ROI: ${totalCost > 0 ? (((totalValue - totalCost) / totalCost) * 100).toFixed(1) : "N/A"}%
- Sports breakdown: ${Object.entries(sportCounts).map(([s, c]) => `${s}: ${c}`).join(", ")}

Top 5 most valuable cards:
${topCards.map((c) => `- ${c.player_name || "Unknown"} (${c.year || "?"} ${c.brand || ""} ${c.set_name || ""}) - ${formatCurrency(c.estimated_value_cents)} ${c.grade_company ? `[${c.grade_company} ${c.grade_value}]` : "[Raw]"}`).join("\n")}

Cards listed for sale: ${cards.filter((c) => c.status === "listed").length}
Cards sold: ${cards.filter((c) => c.status === "sold").length}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a weekly collection report based on this data:\n\n${portfolioSummary}`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response" }, { status: 500 });
    }

    // Save insight
    const { data: insight } = await supabase
      .from("collection_insights")
      .insert({
        user_id: user.id,
        report_html: textBlock.text,
        period_start: new Date(Date.now() - 7 * 86400000).toISOString(),
        period_end: new Date().toISOString(),
      })
      .select()
      .single();

    return NextResponse.json({ insight });
  });
}
