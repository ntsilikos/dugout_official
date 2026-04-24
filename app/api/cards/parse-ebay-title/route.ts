import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withAuth } from "@/lib/api-helpers";

const anthropic = new Anthropic();

const PARSE_SYSTEM_PROMPT = `You are an expert at parsing sports card listing titles from eBay into structured data.

Given an eBay listing title, extract the following fields. Be careful — eBay sellers use abbreviations, varying word order, and sometimes include extra noise (condition codes, location, emojis).

Return ONLY a valid JSON object, no markdown:
{
  "playerName": "<full player name or null>",
  "year": <4-digit year or null>,
  "brand": "<Topps, Panini, Upper Deck, Bowman, Donruss, Fleer, etc. or null>",
  "setName": "<set name like 'Series 1', 'Chrome', 'Prizm', 'Rookie of the Year' or null>",
  "cardNumber": "<exact card number including any letter prefix, e.g. 'LJ32', 'BDC-15', '300' or null>",
  "variant": "<variant/parallel like 'Base', 'Refractor', 'Silver Prizm', 'Gold /50', 'Numbered /99' or null>",
  "isAutograph": <true if title mentions Auto, AU, autograph; false otherwise>,
  "isPatch": <true if title mentions Patch, Jersey, Relic; false otherwise>,
  "isRookie": <true if title mentions Rookie, RC, RPA; false otherwise>,
  "sport": "<Baseball, Basketball, Football, Hockey, Soccer, or null>",
  "confidence": "<'high' | 'medium' | 'low' — your confidence in the parse>"
}

Rules:
- "2005-06" or "2005/06" → year is 2005 (the season starting year)
- "UD" → "Upper Deck"
- "RoY" → "Rookie of the Year" (if context is set name)
- "ROY" alone often means rookie award, not necessarily set name
- Card numbers with letter prefixes ("LJ32", "BDC-15") MUST keep the letters
- If the title says "/99" or "12/99" or "(/250)", that's a numbered parallel — set variant to include "Numbered /99" etc.
- "Refractor" without color → variant is just "Refractor"
- "Silver", "Gold", "Red", "Blue" parallels → variant is "Silver Prizm" / "Gold Refractor" etc., as appropriate based on the brand
- Strip noise: "PSA 9", "BGS 9.5", "MINT", "🔥", emojis, seller initials, "lot of", "best offer"
- If you can't confidently parse a field, use null. Don't guess.`;

export async function POST(request: NextRequest) {
  return withAuth(async () => {
    const { title } = await request.json();

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      temperature: 0.1, // low temperature for consistent parsing
      system: PARSE_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Parse this eBay listing title:\n\n"${title}"`,
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from AI" }, { status: 500 });
    }

    try {
      const parsed = JSON.parse(textBlock.text);
      return NextResponse.json({ parsed });
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 }
      );
    }
  });
}
