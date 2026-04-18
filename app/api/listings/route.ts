import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getProvider } from "@/lib/marketplaces/registry";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MarketplaceConnection, ListingData } from "@/lib/marketplaces/types";

export async function GET(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const { searchParams } = new URL(request.url);
    const marketplace = searchParams.get("marketplace") || "";
    const status = searchParams.get("status") || "";

    let query = supabase
      .from("listings")
      .select("*, cards(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (marketplace) query = query.eq("marketplace", marketplace);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listings: data || [] });
  });
}

export async function POST(request: NextRequest) {
  return withAuth(async (user, supabase) => {
    const body = await request.json();
    const { card_id, marketplaces, title, description, price_cents } = body;

    if (!card_id || !marketplaces?.length || !title || !price_cents) {
      return NextResponse.json(
        { error: "card_id, marketplaces, title, and price_cents are required" },
        { status: 400 }
      );
    }

    // Get card images for listing — use short proxy URLs so they
    // don't exceed eBay's 500-char-per-URL / 3975-char-total limits
    const { data: images } = await supabase
      .from("card_images")
      .select("storage_path, is_primary")
      .eq("card_id", card_id)
      .eq("user_id", user.id);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const imageUrls: { url: string; isPrimary: boolean }[] = [];
    for (const img of images || []) {
      const proxyUrl = `${appUrl}/api/images/proxy?path=${encodeURIComponent(img.storage_path)}`;
      imageUrls.push({ url: proxyUrl, isPrimary: img.is_primary });
    }

    // Get card data for listing metadata
    const { data: card } = await supabase
      .from("cards")
      .select("*")
      .eq("id", card_id)
      .eq("user_id", user.id)
      .single();

    const listingData: ListingData = {
      title,
      description: description || "",
      priceCents: price_cents,
      currency: "USD",
      quantity: 1,
      images: imageUrls,
      condition: card?.condition || "raw",
      gradeCompany: card?.grade_company || undefined,
      gradeValue: card?.grade_value || undefined,
      sport: card?.sport || undefined,
      playerName: card?.player_name || undefined,
      year: card?.year || undefined,
      brand: card?.brand || undefined,
      setName: card?.set_name || undefined,
      cardNumber: card?.card_number || undefined,
    };

    const results = [];

    for (const marketplace of marketplaces as string[]) {
      try {
        // Get user's connection for this marketplace
        const { data: connection } = await supabase
          .from("marketplace_connections")
          .select("*")
          .eq("user_id", user.id)
          .eq("marketplace", marketplace)
          .eq("is_active", true)
          .single();

        if (!connection) {
          results.push({
            marketplace,
            error: `Not connected to ${marketplace}`,
          });
          continue;
        }

        const provider = getProvider(marketplace);
        const result = await provider.createListing(
          connection as MarketplaceConnection,
          listingData
        );

        // Save listing to DB
        const { data: listing } = await supabase
          .from("listings")
          .insert({
            user_id: user.id,
            card_id,
            marketplace,
            marketplace_listing_id: result.marketplace_listing_id,
            marketplace_url: result.marketplace_url,
            status: "active",
            title,
            description,
            price_cents,
            ai_generated_title: body.ai_generated_title || null,
            ai_generated_description: body.ai_generated_description || null,
            listed_at: new Date().toISOString(),
          })
          .select()
          .single();

        results.push({ marketplace, listing, success: true });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        // Save failed listing
        await supabase.from("listings").insert({
          user_id: user.id,
          card_id,
          marketplace,
          status: "error",
          title,
          description,
          price_cents,
          error_message: msg,
        });

        results.push({ marketplace, error: msg });
      }
    }

    // Only update card status if at least one listing succeeded
    const anySuccess = results.some((r) => "success" in r && r.success);
    if (anySuccess) {
      await supabase
        .from("cards")
        .update({ status: "listed" })
        .eq("id", card_id)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ results }, { status: 201 });
  });
}
