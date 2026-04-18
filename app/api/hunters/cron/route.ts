import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/marketplaces/registry";
import type { MarketplaceConnection, MarketplaceSearchQuery } from "@/lib/marketplaces/types";

export async function POST(request: NextRequest) {
  // Verify cron secret
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get all active searches
  const { data: searches } = await supabase
    .from("card_searches")
    .select("*")
    .eq("is_active", true);

  if (!searches?.length) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const search of searches) {
    const filters = search.filters as Record<string, string | number | boolean>;
    const keywords = [
      filters.athlete,
      filters.sport,
      filters.year,
      filters.manufacturer,
      filters.set_name,
    ]
      .filter(Boolean)
      .join(" ");

    const query: MarketplaceSearchQuery = {
      keyword: keywords || "sports card",
      sport: filters.sport as string | undefined,
      maxPrice: search.max_price_cents || undefined,
    };

    const marketplaces = (search.marketplaces as string[])?.length
      ? (search.marketplaces as string[])
      : ["ebay"];

    let newResults = 0;

    for (const marketplace of marketplaces) {
      try {
        const { data: connection } = await supabase
          .from("marketplace_connections")
          .select("*")
          .eq("user_id", search.user_id)
          .eq("marketplace", marketplace)
          .eq("is_active", true)
          .single();

        const provider = getProvider(marketplace);
        const results = await provider.searchListings(
          (connection || {}) as MarketplaceConnection,
          query
        );

        for (const result of results.slice(0, 20)) {
          const { error } = await supabase
            .from("search_results")
            .upsert(
              {
                search_id: search.id,
                user_id: search.user_id,
                marketplace,
                marketplace_listing_id: result.marketplace_listing_id,
                listing_url: result.listing_url,
                title: result.title,
                price_cents: result.price_cents,
                image_url: result.image_url,
                seller_name: result.seller_name,
                found_at: new Date().toISOString(),
              },
              {
                onConflict: "search_id,marketplace,marketplace_listing_id",
                ignoreDuplicates: true,
              }
            );

          if (!error) newResults++;
        }
      } catch {
        // Skip failed searches
      }
    }

    // Update search and create notification
    const { count } = await supabase
      .from("search_results")
      .select("*", { count: "exact", head: true })
      .eq("search_id", search.id)
      .eq("is_dismissed", false);

    await supabase
      .from("card_searches")
      .update({ last_run_at: new Date().toISOString(), result_count: count || 0 })
      .eq("id", search.id);

    if (newResults > 0) {
      await supabase.from("notifications").insert({
        user_id: search.user_id,
        type: "search_match",
        title: `${newResults} new match${newResults > 1 ? "es" : ""}`,
        body: `"${search.name}" found ${newResults} new result${newResults > 1 ? "s" : ""}.`,
        link: `/hunters/${search.id}`,
      });
    }

    processed++;
  }

  return NextResponse.json({ processed });
}
