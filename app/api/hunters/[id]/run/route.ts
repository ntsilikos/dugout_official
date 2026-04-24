import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getProvider } from "@/lib/marketplaces/registry";
import { getConfiguredMarketplaces } from "@/lib/config";
import { buildHunterQuery, filterListingsByCardNumbers } from "@/lib/hunter-query";
import type { MarketplaceConnection } from "@/lib/marketplaces/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: search } = await supabase
      .from("card_searches")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!search) {
      return NextResponse.json({ error: "Search not found" }, { status: 404 });
    }

    const configuredMPs = getConfiguredMarketplaces();
    if (configuredMPs.length === 0) {
      return NextResponse.json({
        error: "marketplace_not_configured",
        message:
          "No marketplace API keys are configured. Add eBay or TikTok credentials to enable searches.",
        newResults: 0,
        totalResults: 0,
      });
    }

    const filters = search.filters as Record<string, string | number | boolean>;
    const query = buildHunterQuery(filters, search.max_price_cents);

    // Determine marketplaces to search — use saved selection, fall back to all
    // configured if none specified, then intersect with what's configured.
    const requested = (search.marketplaces as string[])?.length
      ? (search.marketplaces as string[])
      : configuredMPs;
    const marketplacesToSearch = requested.filter((mp) =>
      configuredMPs.includes(mp)
    );

    if (marketplacesToSearch.length === 0) {
      return NextResponse.json({
        error: "marketplace_not_configured",
        message:
          "None of this search's selected marketplaces are configured. Edit the search or connect those marketplaces.",
        newResults: 0,
        totalResults: 0,
      });
    }

    let newResults = 0;
    const errors: { marketplace: string; message: string }[] = [];

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
        const rawResults = await provider.searchListings(
          (connection || {}) as MarketplaceConnection,
          query
        );

        // If this hunter targets specific card numbers (e.g. "missing from set"),
        // filter results to listings whose titles mention one of those numbers.
        const targetNums = (search.target_card_numbers as string[] | null) || null;
        const results = filterListingsByCardNumbers(rawResults, targetNums);

        if (targetNums && targetNums.length > 0) {
          console.log(
            `[hunters/run] ${marketplace}: ${rawResults.length} raw → ${results.length} after card-# filter (${targetNums.length} targets)`
          );
        }

        for (const result of results) {
          const { error } = await supabase.from("search_results").upsert(
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
        console.log(
          `[hunters/run] ${marketplace}: ${results.length} listings, ${newResults} new`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`[hunters/run] ${marketplace} failed:`, message);
        errors.push({ marketplace, message });
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

    if (newResults > 0) {
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "search_match",
        title: `${newResults} new match${newResults > 1 ? "es" : ""} found`,
        body: `Your search "${search.name}" found ${newResults} new result${newResults > 1 ? "s" : ""}.`,
        link: `/hunters/${id}`,
      });
    }

    return NextResponse.json({
      newResults,
      totalResults: resultCount || 0,
      query: query.keyword,
      errors,
    });
  });
}
