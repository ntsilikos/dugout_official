import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/marketplaces/registry";
import { getConfiguredMarketplaces } from "@/lib/config";
import { buildHunterQuery, filterListingsByCardNumbers } from "@/lib/hunter-query";
import { isAuthorizedCron } from "@/lib/cron-auth";
import type { MarketplaceConnection } from "@/lib/marketplaces/types";

async function runCron(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configuredMPs = getConfiguredMarketplaces();
  if (configuredMPs.length === 0) {
    return NextResponse.json({
      processed: 0,
      message: "No marketplaces configured",
    });
  }

  const supabase = createAdminClient();

  const { data: searches } = await supabase
    .from("card_searches")
    .select("*")
    .eq("is_active", true);

  if (!searches?.length) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;
  let totalNewResults = 0;
  let totalErrors = 0;

  for (const search of searches) {
    const filters = search.filters as Record<string, string | number | boolean>;
    // Use the same shared helper the manual run uses, so all filters
    // (autographed, grader, grade range, card_number, parallel, year range)
    // are honored here too — not silently dropped.
    const query = buildHunterQuery(filters, search.max_price_cents);

    const requested = (search.marketplaces as string[])?.length
      ? (search.marketplaces as string[])
      : configuredMPs;
    const marketplaces = requested.filter((mp) => configuredMPs.includes(mp));

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
        const rawResults = await provider.searchListings(
          (connection || {}) as MarketplaceConnection,
          query
        );

        // Apply card-number whitelist if this hunter targets specific numbers
        const targetNums = (search.target_card_numbers as string[] | null) || null;
        const results = filterListingsByCardNumbers(rawResults, targetNums);

        for (const result of results.slice(0, 30)) {
          const { error } = await supabase.from("search_results").upsert(
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
      } catch (err) {
        totalErrors++;
        console.error(
          `[hunters/cron] search ${search.id} ${marketplace} failed:`,
          err instanceof Error ? err.message : "unknown"
        );
      }
    }

    const { count } = await supabase
      .from("search_results")
      .select("*", { count: "exact", head: true })
      .eq("search_id", search.id)
      .eq("is_dismissed", false);

    await supabase
      .from("card_searches")
      .update({
        last_run_at: new Date().toISOString(),
        result_count: count || 0,
      })
      .eq("id", search.id);

    if (newResults > 0) {
      await supabase.from("notifications").insert({
        user_id: search.user_id,
        type: "search_match",
        title: `${newResults} new match${newResults > 1 ? "es" : ""}`,
        body: `"${search.name}" found ${newResults} new result${newResults > 1 ? "s" : ""}.`,
        link: `/hunters/${search.id}`,
      });
      totalNewResults += newResults;
    }

    processed++;
  }

  return NextResponse.json({
    processed,
    totalNewResults,
    totalErrors,
  });
}

// Vercel Cron sends GET; external cron services typically use POST. Accept both.
export async function GET(request: NextRequest) {
  return runCron(request);
}

export async function POST(request: NextRequest) {
  return runCron(request);
}
