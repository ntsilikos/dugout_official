import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getProvider } from "@/lib/marketplaces/registry";
import { getConfiguredMarketplaces } from "@/lib/config";
import type { MarketplaceConnection, MarketplaceSearchQuery } from "@/lib/marketplaces/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    // Get the search
    const { data: search } = await supabase
      .from("card_searches")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!search) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }

    // Check if any marketplaces are configured
    const configuredMPs = getConfiguredMarketplaces();
    if (configuredMPs.length === 0) {
      return NextResponse.json({
        error: "marketplace_not_configured",
        message: "No marketplace API keys are configured. Add your eBay API credentials in your environment to enable marketplace searches.",
        newResults: 0,
        totalResults: 0,
      });
    }

    const filters = search.filters as Record<string, string | number | boolean>;

    // Build search query from filters
    const keywords = [
      filters.athlete,
      filters.sport,
      filters.year,
      filters.manufacturer,
      filters.set_name,
      filters.parallel,
      filters.card_number,
    ]
      .filter(Boolean)
      .join(" ");

    const query: MarketplaceSearchQuery = {
      keyword: keywords || "sports card",
      sport: filters.sport as string | undefined,
      maxPrice: search.max_price_cents || undefined,
      grader: filters.grader as string | undefined,
      minGrade: filters.grade_min as number | undefined,
      maxGrade: filters.grade_max as number | undefined,
    };

    // Get user's marketplace connections
    const marketplacesToSearch = (search.marketplaces as string[])?.length
      ? (search.marketplaces as string[])
      : ["ebay"];

    let newResults = 0;

    for (const marketplace of marketplacesToSearch) {
      try {
        const { data: connection } = await supabase
          .from("marketplace_connections")
          .select("*")
          .eq("user_id", user.id)
          .eq("marketplace", marketplace)
          .eq("is_active", true)
          .single();

        const provider = getProvider(marketplace);
        const results = await provider.searchListings(
          (connection || {}) as MarketplaceConnection,
          query
        );

        // Insert new results, skip duplicates
        for (const result of results) {
          const { error } = await supabase
            .from("search_results")
            .upsert(
              {
                search_id: id,
                user_id: user.id,
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
        // Skip failed marketplace searches
      }
    }

    // Update search metadata
    const { count: resultCount } = await supabase
      .from("search_results")
      .select("*", { count: "exact", head: true })
      .eq("search_id", id)
      .eq("is_dismissed", false);

    await supabase
      .from("card_searches")
      .update({
        last_run_at: new Date().toISOString(),
        result_count: resultCount || 0,
      })
      .eq("id", id);

    // Create notification if new results found
    if (newResults > 0) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "search_match",
        title: `${newResults} new match${newResults > 1 ? "es" : ""} found`,
        body: `Your search "${search.name}" found ${newResults} new result${newResults > 1 ? "s" : ""}.`,
        link: `/hunters/${id}`,
      });
    }

    return NextResponse.json({ newResults, totalResults: resultCount || 0 });
  });
}
