import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { fetchComps } from "@/lib/pricing";
import { isCardHedgeConfigured, isEbayConfigured } from "@/lib/config";
import { getPricesByCert, imageSearch } from "@/lib/cardhedge";
import { createAdminClient } from "@/lib/supabase/admin";

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

    if (!isCardHedgeConfigured() && !isEbayConfigured()) {
      return NextResponse.json({
        comps: [],
        average_cents: 0,
        median_cents: 0,
        low_cents: 0,
        high_cents: 0,
        count: 0,
        query: "",
        configured: false,
      });
    }

    const admin = createAdminClient();

    // Fetch the user's primary card image for side-by-side comparison
    const { data: cardImages } = await admin
      .from("card_images")
      .select("storage_path, is_primary, side")
      .eq("card_id", id)
      .eq("user_id", user.id);

    const frontImage =
      cardImages?.find((img) => img.side === "front" || img.is_primary) ||
      cardImages?.[0];

    let userImageUrl: string | null = null;
    let userImageBase64: string | null = null;
    if (frontImage?.storage_path) {
      const { data: signed } = await admin.storage
        .from("card-images")
        .createSignedUrl(frontImage.storage_path, 3600);
      userImageUrl = signed?.signedUrl || null;

      // Also fetch the image as base64 for CardHedge image-search
      try {
        const { data: blob } = await admin.storage
          .from("card-images")
          .download(frontImage.storage_path);
        if (blob) {
          const buffer = Buffer.from(await blob.arrayBuffer());
          userImageBase64 = buffer.toString("base64");
        }
      } catch {
        // Image download failed — continue without it
      }
    }

    const comps = await fetchComps(card);

    // Image-search verification: return up to 8 candidates so user can pick
    // the right one if the automatic match is off
    let imageMatch: {
      card_id: string;
      description: string;
      image: string;
      similarity: number;
    } | null = null;
    let imageCandidates: Array<{
      card_id: string;
      description: string;
      image: string;
      similarity: number;
      number?: string;
      variant?: string;
      set?: string;
    }> = [];
    let matchAgreement: "both-agree" | "text-only" | "image-differs" | "none" = "none";

    if (isCardHedgeConfigured() && userImageBase64) {
      try {
        const imageResults = await imageSearch(userImageBase64);
        imageCandidates = (imageResults.results || [])
          .slice(0, 8)
          .map((r) => ({
            card_id: r.card_id,
            description: r.description,
            image: r.image?.startsWith("//") ? `https:${r.image}` : r.image,
            similarity: r.similarity,
            number: r.number,
            variant: r.variant,
            set: r.set,
          }));

        const top = imageCandidates[0];
        if (top && top.similarity >= 0.5) {
          imageMatch = {
            card_id: top.card_id,
            description: top.description,
            image: top.image,
            similarity: top.similarity,
          };

          if (comps.cardhedge_card_id && top.card_id === comps.cardhedge_card_id) {
            matchAgreement = "both-agree";
          } else if (comps.cardhedge_card_id) {
            matchAgreement = "image-differs";
          } else {
            matchAgreement = "text-only";
          }
          console.log(
            `[comps] Image match: ${top.description} (${top.similarity.toFixed(2)}) — ${matchAgreement}. ${imageCandidates.length} candidates available.`
          );
        }
      } catch {
        // Image search failed — not critical
      }
    }

    // Persist the CardHedge card ID if we got a new match
    if (
      comps.cardhedge_card_id &&
      comps.cardhedge_card_id !== card.cardhedge_card_id
    ) {
      await admin
        .from("cards")
        .update({ cardhedge_card_id: comps.cardhedge_card_id })
        .eq("id", id);
    }

    // If card has a cert number, also fetch cert-based pricing
    let certPricing = null;
    if (card.cert_number) {
      try {
        certPricing = await getPricesByCert(card.cert_number);
      } catch {
        // Cert pricing optional
      }
    }

    return NextResponse.json({
      ...comps,
      configured: true,
      certPricing,
      userImageUrl,
      matchedTo: comps.cardhedge_match
        ? {
            description: comps.cardhedge_match.description,
            player: comps.cardhedge_match.player,
            set: comps.cardhedge_match.set,
            number: comps.cardhedge_match.number,
            variant: comps.cardhedge_match.variant,
            confidence: comps.cardhedge_match.confidence,
            image: comps.cardhedge_match.image,
          }
        : null,
      imageMatch,
      imageCandidates,
      matchAgreement,
    });
  });
}
