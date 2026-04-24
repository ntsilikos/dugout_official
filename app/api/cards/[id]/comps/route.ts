import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { withAuth } from "@/lib/api-helpers";
import { fetchCompsEbay, type CompSummary } from "@/lib/pricing";
import { isAnthropicConfigured, isEbayConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic();

const VALID_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_VISUAL_CANDIDATES = 15;
const VISION_BATCH_SIZE = 5;
const MIN_VISUAL_CONFIDENCE = 0.75;

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

type EncodedImage = {
  data: string;
  mediaType: ImageMediaType;
};

type EbayComp = {
  title: string;
  price_cents: number;
  sold_date: string;
  condition: string;
  image_url: string | null;
  listing_url: string;
  visual_confidence?: number;
  visual_reason?: string;
};

type VisionCandidate = EbayComp & {
  encodedImage: EncodedImage;
};

type VisionDecision = {
  candidate_index: number;
  same_card: boolean;
  confidence: number;
  reason: string;
};

type VisualFilterResult = {
  applied: boolean;
  comparedCount: number;
  matched: EbayComp[];
  reason?: string;
};

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  return JSON.parse(withoutFence);
}

function summarizeComps(comps: EbayComp[], query: string): CompSummary {
  const validPrices = comps
    .map((comp) => comp.price_cents)
    .filter((price) => price >= 100)
    .sort((a, b) => a - b);

  let trimmed = validPrices;
  if (validPrices.length >= 4) {
    const q1 = validPrices[Math.floor(validPrices.length * 0.25)];
    const q3 = validPrices[Math.floor(validPrices.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = Math.max(0, q1 - 1.5 * iqr);
    const upperBound = q3 + 1.5 * iqr;
    trimmed = validPrices.filter((price) => price >= lowerBound && price <= upperBound);
  }

  return {
    comps,
    average_cents: trimmed.length
      ? Math.round(trimmed.reduce((sum, price) => sum + price, 0) / trimmed.length)
      : 0,
    median_cents: trimmed.length ? trimmed[Math.floor(trimmed.length / 2)] : 0,
    low_cents: trimmed.length ? trimmed[0] : 0,
    high_cents: trimmed.length ? trimmed[trimmed.length - 1] : 0,
    count: trimmed.length,
    query,
    source: "ebay",
  };
}

async function encodeRemoteImage(url: string): Promise<EncodedImage | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
    if (!contentType || !VALID_MEDIA_TYPES.has(contentType)) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer.byteLength || arrayBuffer.byteLength > 5_000_000) {
      return null;
    }

    return {
      data: Buffer.from(arrayBuffer).toString("base64"),
      mediaType: contentType as ImageMediaType,
    };
  } catch {
    return null;
  }
}

async function compareBatch(
  userImage: EncodedImage,
  candidates: VisionCandidate[],
  cardTitle: string
): Promise<VisionDecision[]> {
  type VisionContent =
    | {
        type: "image";
        source: { type: "base64"; media_type: ImageMediaType; data: string };
      }
    | { type: "text"; text: string };

  const content: VisionContent[] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: userImage.mediaType,
        data: userImage.data,
      },
    },
    {
      type: "text",
      text: `The first image is the user's sports card: ${cardTitle}.

For each candidate image that follows, decide if it is the exact same card as the user's card.
Be strict and conservative.

Mark same_card=false if the candidate looks like a different subset, insert, parallel, refractor, color, variation, auto, memorabilia card, different photo/layout, or different card number. Use the eBay title only as supporting context. Prioritize the actual card image.

Return JSON only in this exact shape:
{"results":[{"candidate_index":1,"same_card":true,"confidence":0.91,"reason":"short reason"}]}`,
    },
  ];

  candidates.forEach((candidate, index) => {
    content.push({
      type: "text",
      text: `Candidate ${index + 1} title: ${candidate.title}`,
    });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: candidate.encodedImage.mediaType,
        data: candidate.encodedImage.data,
      },
    });
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    temperature: 0,
    messages: [{ role: "user", content }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from visual comparison");
  }

  const parsed = parseJson(textBlock.text) as { results?: VisionDecision[] };
  return Array.isArray(parsed.results) ? parsed.results : [];
}

async function visuallyFilterEbayComps(
  comps: EbayComp[],
  userImage: EncodedImage,
  cardTitle: string
): Promise<VisualFilterResult> {
  const imageComps = comps.filter((comp) => comp.image_url).slice(0, MAX_VISUAL_CANDIDATES);
  if (!imageComps.length) {
    return {
      applied: true,
      comparedCount: 0,
      matched: [],
      reason: "no_listing_images",
    };
  }

  const prepared = await Promise.all(
    imageComps.map(async (comp) => {
      const encodedImage = await encodeRemoteImage(comp.image_url!);
      return encodedImage ? { ...comp, encodedImage } : null;
    })
  );

  const candidates = prepared.filter((candidate): candidate is VisionCandidate => !!candidate);
  if (!candidates.length) {
    return {
      applied: true,
      comparedCount: 0,
      matched: [],
      reason: "listing_images_unavailable",
    };
  }

  const matchedByUrl = new Map<string, EbayComp>();

  for (let i = 0; i < candidates.length; i += VISION_BATCH_SIZE) {
    const batch = candidates.slice(i, i + VISION_BATCH_SIZE);
    const decisions = await compareBatch(userImage, batch, cardTitle);

    for (const decision of decisions) {
      const candidate = batch[decision.candidate_index - 1];
      if (!candidate) continue;

      const confidence = Number.isFinite(decision.confidence) ? decision.confidence : 0;
      const reason = decision.reason || "";

      if (decision.same_card && confidence >= MIN_VISUAL_CONFIDENCE) {
        matchedByUrl.set(candidate.listing_url || candidate.image_url || candidate.title, {
          ...candidate,
          visual_confidence: confidence,
          visual_reason: reason,
        });
        console.log(
          `[ebay-image] ACCEPTED: ${JSON.stringify(candidate.title)} (${confidence.toFixed(
            2
          )} - ${reason})`
        );
      } else {
        console.log(
          `[ebay-image] REJECTED: ${JSON.stringify(candidate.title)} (${confidence.toFixed(
            2
          )} - ${reason || "not the same card"})`
        );
      }
    }
  }

  return {
    applied: true,
    comparedCount: candidates.length,
    matched: comps.filter((comp) =>
      matchedByUrl.has(comp.listing_url || comp.image_url || comp.title)
    ).map((comp) => matchedByUrl.get(comp.listing_url || comp.image_url || comp.title) || comp),
  };
}

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

    if (!isEbayConfigured()) {
      return NextResponse.json({
        comps: [],
        average_cents: 0,
        median_cents: 0,
        low_cents: 0,
        high_cents: 0,
        count: 0,
        query: "",
        source: "ebay",
        configured: false,
      });
    }

    const admin = createAdminClient();

    const { data: cardImages } = await admin
      .from("card_images")
      .select("storage_path, is_primary, side")
      .eq("card_id", id)
      .eq("user_id", user.id);

    const frontImage =
      cardImages?.find((img) => img.side === "front" || img.is_primary) ||
      cardImages?.[0];

    let userImageUrl: string | null = null;
    let userImage: EncodedImage | null = null;
    if (frontImage?.storage_path) {
      const { data: signed } = await admin.storage
        .from("card-images")
        .createSignedUrl(frontImage.storage_path, 3600);
      userImageUrl = signed?.signedUrl || null;

      try {
        const { data: blob } = await admin.storage
          .from("card-images")
          .download(frontImage.storage_path);

        if (blob) {
          const mediaType = blob.type?.split(";")[0]?.toLowerCase();
          if (mediaType && VALID_MEDIA_TYPES.has(mediaType)) {
            const buffer = Buffer.from(await blob.arrayBuffer());
            userImage = {
              data: buffer.toString("base64"),
              mediaType: mediaType as ImageMediaType,
            };
          }
        }
      } catch {
        // Image download failed; eBay title filtering can still run.
      }
    }

    const ebaySummary = await fetchCompsEbay(card);
    let visualResult: VisualFilterResult = {
      applied: false,
      comparedCount: 0,
      matched: ebaySummary.comps as EbayComp[],
    };

    if (!userImage) {
      visualResult.reason = "missing_user_image";
    } else if (!isAnthropicConfigured()) {
      visualResult.reason = "anthropic_not_configured";
    } else if (ebaySummary.comps.length) {
      try {
        visualResult = await visuallyFilterEbayComps(
          ebaySummary.comps as EbayComp[],
          userImage,
          [
            card.year,
            card.brand,
            card.set_name,
            card.player_name,
            card.card_number ? `#${card.card_number}` : null,
            card.variant,
          ]
            .filter(Boolean)
            .join(" ")
        );
      } catch (error) {
        console.error(
          "[comps] Visual comparison failed:",
          error instanceof Error ? error.message : error
        );
        visualResult = {
          applied: false,
          comparedCount: 0,
          matched: ebaySummary.comps as EbayComp[],
          reason: "visual_compare_failed",
        };
      }
    }

    const finalComps = visualResult.applied ? visualResult.matched : (ebaySummary.comps as EbayComp[]);
    const summary = summarizeComps(finalComps, ebaySummary.query);
    const topVisualMatch = [...finalComps]
      .sort((a, b) => (b.visual_confidence || 0) - (a.visual_confidence || 0))[0] || null;

    return NextResponse.json({
      ...summary,
      configured: true,
      source: "ebay",
      userImageUrl,
      visualFilterApplied: visualResult.applied,
      visualFilterReason: visualResult.reason || null,
      comparedCount: visualResult.comparedCount,
      acceptedCount: visualResult.applied ? finalComps.length : null,
      topVisualMatch: topVisualMatch
        ? {
            title: topVisualMatch.title,
            image_url: topVisualMatch.image_url,
            listing_url: topVisualMatch.listing_url,
            confidence: topVisualMatch.visual_confidence || 0,
            reason: topVisualMatch.visual_reason || "",
          }
        : null,
    });
  });
}
