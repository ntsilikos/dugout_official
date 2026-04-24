import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SCAN_SYSTEM_PROMPT } from "@/lib/scan-prompt";
import { createClient } from "@/lib/supabase/server";
import { isCardHedgeConfigured, isEbayConfigured } from "@/lib/config";
import { matchCard, imageSearch } from "@/lib/cardhedge";
import { fetchCompsEbay } from "@/lib/pricing";
import type { ScanResponse, ScanResult } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(
  request: NextRequest
): Promise<NextResponse<ScanResponse>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { image, mediaType, backImage, backMediaType } = await request.json();

    if (!image || !mediaType) {
      return NextResponse.json(
        { success: false, error: "Front image and media type are required" },
        { status: 400 }
      );
    }

    type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const content: Array<
      | {
          type: "image";
          source: { type: "base64"; media_type: ImageMediaType; data: string };
        }
      | { type: "text"; text: string }
    > = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType as ImageMediaType,
          data: image,
        },
      },
    ];

    if (backImage && backMediaType) {
      content.push({
        type: "image",
        source: {
          type: "base64",
          media_type: backMediaType as ImageMediaType,
          data: backImage,
        },
      });
      content.push({
        type: "text",
        text: "The first image is the FRONT of the card. The second image is the BACK. Use the back image to verify the year (usually in the copyright line like '© 2023 TOPPS'), set name, and card number. The back is much more reliable than the front for these fields. Identify and grade this sports card. Return the full analysis as JSON.",
      });
    } else {
      content.push({
        type: "text",
        text: "Identify and grade this sports card. Return the full analysis as JSON.",
      });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: SCAN_SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 500 }
      );
    }

    const result: ScanResult = JSON.parse(textBlock.text);

    // CardHedge verification — TWO-PHASE:
    // 1. Text match (by identified player/year/set)
    // 2. Image match (visual similarity to actual photo)
    // We trust the result most when BOTH agree.
    if (isCardHedgeConfigured() && (result.playerName || result.setName)) {
      let textMatchId: string | null = null;
      let textMatchConfidence = 0;
      let textMatch: Awaited<ReturnType<typeof matchCard>>["match"] | null = null;

      // Phase 1: text-based match
      try {
        const query = [
          result.year,
          result.brand,
          result.setName,
          result.playerName,
        ].filter(Boolean).join(" ");

        if (query.trim()) {
          const match = await matchCard(query);
          if (match.match && match.match.confidence >= 0.7) {
            textMatch = match.match;
            textMatchId = match.match.card_id;
            textMatchConfidence = match.match.confidence;
            console.log(
              `[scan] Text match: "${match.match.description}" (${textMatchConfidence.toFixed(2)})`
            );
          }
        }
      } catch (err) {
        console.log(
          `[scan] Text match failed: ${err instanceof Error ? err.message : "unknown"}`
        );
      }

      // Phase 2: image-based match using the actual scanned photo
      let imageMatchId: string | null = null;
      let imageMatch: { card_id: string; description: string; player: string; set: string; number: string; variant: string; image: string; similarity: number } | null = null;
      try {
        const imageResults = await imageSearch(image);
        const topImageMatch = imageResults.results?.[0];
        if (topImageMatch && topImageMatch.similarity >= 0.6) {
          imageMatchId = topImageMatch.card_id;
          imageMatch = topImageMatch;
          console.log(
            `[scan] Image match: "${topImageMatch.description}" (similarity: ${topImageMatch.similarity.toFixed(2)})`
          );
        }
      } catch (err) {
        console.log(
          `[scan] Image search failed: ${err instanceof Error ? err.message : "unknown"}`
        );
      }

      // Pick the best match. Visual match wins when it disagrees with text match,
      // because text can be fooled by similar-sounding metadata but images don't lie.
      let finalMatch: typeof textMatch | typeof imageMatch | null = null;
      let matchSource: "text+image" | "image-only" | "text-only" | "none" = "none";

      if (textMatchId && imageMatchId && textMatchId === imageMatchId) {
        // Both agree — high confidence
        finalMatch = textMatch;
        matchSource = "text+image";
        console.log(`[scan] Match agreement — high confidence`);
      } else if (imageMatchId && imageMatch) {
        // Visual match disagrees with text — trust visual
        finalMatch = imageMatch as unknown as typeof textMatch;
        matchSource = "image-only";
        if (textMatchId && textMatchId !== imageMatchId) {
          console.log(
            `[scan] Text & image disagree — preferring image match`
          );
        }
      } else if (textMatch) {
        finalMatch = textMatch;
        matchSource = "text-only";
      }

      if (finalMatch) {
        const m = finalMatch;
        const yearMatch = m.set?.match(/^(\d{4})\s/);

        // Correct fields from CardHedge's authoritative data
        if (m.player) result.playerName = m.player;
        if (yearMatch) result.year = parseInt(yearMatch[1]);
        if (m.set) result.setName = m.set;
        if (m.number) result.cardNumber = m.number;
        if (m.variant) result.variant = m.variant;

        // category only exists on text match, not image match
        if ("category" in m && m.category) {
          result.sport = m.category as string;
        }

        // Extract brand from set name
        const brand = m.set
          ?.replace(/^\d{4}\s+/, "")
          .replace(/\s+(Baseball|Basketball|Football|Hockey|Soccer)$/i, "");
        if (brand) result.brand = brand;

        // Use CardHedge price if available — only text match has `prices`
        if ("prices" in m && Array.isArray(m.prices)) {
          const gradeKey = result.overallGrade
            ? `PSA ${result.overallGrade}`
            : "Raw";
          const matchedPrice = m.prices.find(
            (p: { grade: string; price: string }) =>
              p.grade === gradeKey || p.grade === "Raw"
          );
          if (matchedPrice) {
            result.estimatedValueCents = Math.round(
              parseFloat(matchedPrice.price) * 100
            );
          }
        }

        // Store the CardHedge card ID + matched card image for UI comparison
        const asRecord = result as unknown as Record<string, unknown>;
        asRecord.cardhedgeCardId = m.card_id;
        asRecord.matchedImageUrl = m.image
          ? m.image.startsWith("//")
            ? `https:${m.image}`
            : m.image
          : null;
        asRecord.matchDescription = m.description;
        asRecord.matchSource = matchSource;
        asRecord.matchConfidence =
          matchSource === "text+image"
            ? Math.max(textMatchConfidence, imageMatch?.similarity || 0)
            : matchSource === "image-only"
              ? imageMatch?.similarity || 0
              : textMatchConfidence;
      }
    }

    // Search eBay for visual comps — real listings with images the user can compare
    let ebayComps: { title: string; price_cents: number; image_url: string | null; listing_url: string }[] = [];
    if (isEbayConfigured() && (result.playerName || result.setName)) {
      try {
        const ebayResult = await fetchCompsEbay({
          player_name: result.playerName,
          year: result.year,
          brand: result.brand,
          set_name: result.setName,
          card_number: result.cardNumber,
          variant: result.variant,
        });
        ebayComps = ebayResult.comps
          .filter((c) => c.image_url)
          .slice(0, 24)
          .map((c) => ({
            title: c.title,
            price_cents: c.price_cents,
            image_url: c.image_url,
            listing_url: c.listing_url,
          }));

        // Use eBay median as primary price if available and better than current
        if (ebayResult.median_cents > 0 && !result.estimatedValueCents) {
          result.estimatedValueCents = ebayResult.median_cents;
        }
      } catch {
        // eBay search failed — not critical
      }
    }

    return NextResponse.json({ success: true, result, ebayComps } as ScanResponse & { ebayComps: typeof ebayComps });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
