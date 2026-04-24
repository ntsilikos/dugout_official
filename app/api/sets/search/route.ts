import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { isCardHedgeConfigured } from "@/lib/config";

interface CardHedgeSet {
  id: string;
  name: string;
  year: string;
  set_type: string;
  category: string;
  image: string;
  "30 Day Sales"?: number;
}

export async function GET(request: NextRequest) {
  return withAuth(async () => {
    if (!isCardHedgeConfigured()) {
      return NextResponse.json(
        { error: "CardHedge not configured", sets: [] },
        { status: 400 }
      );
    }

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    if (!query || query.length < 2) {
      return NextResponse.json({ sets: [] });
    }

    const apiKey = process.env.CARDHEDGE_API_KEY;
    try {
      const res = await fetch("https://api.cardhedger.com/v1/cards/set-search", {
        method: "POST",
        headers: {
          "X-API-Key": apiKey!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        console.error("[sets/search] CardHedge error:", res.status);
        return NextResponse.json({ sets: [], error: "Search failed" });
      }

      const data = await res.json();
      const sets = (data.sets || [])
        .slice(0, 20)
        .map((s: CardHedgeSet) => ({
          cardhedge_set_id: s.id,
          name: s.name,
          year: s.year ? parseInt(s.year) : null,
          set_type: s.set_type,
          category: s.category,
          image: s.image
            ? s.image.startsWith("//")
              ? `https:${s.image}`
              : s.image
            : null,
          popularity: s["30 Day Sales"] || 0,
        }));

      return NextResponse.json({ sets });
    } catch (err) {
      console.error("[sets/search] error:", err);
      return NextResponse.json({ sets: [], error: "Search failed" });
    }
  });
}
