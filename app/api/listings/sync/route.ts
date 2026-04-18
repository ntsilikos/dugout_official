import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getProvider } from "@/lib/marketplaces/registry";
import type { MarketplaceConnection } from "@/lib/marketplaces/types";

export async function POST() {
  return withAuth(async (user, supabase) => {
    // Get all active listings
    const { data: listings } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active");

    if (!listings?.length) {
      return NextResponse.json({ synced: 0 });
    }

    // Get user's marketplace connections
    const { data: connections } = await supabase
      .from("marketplace_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const connectionMap = new Map(
      (connections || []).map((c) => [c.marketplace, c])
    );

    let synced = 0;
    const sold: string[] = [];

    for (const listing of listings) {
      const connection = connectionMap.get(listing.marketplace);
      if (!connection || !listing.marketplace_listing_id) continue;

      try {
        const provider = getProvider(listing.marketplace);
        const status = await provider.getListingStatus(
          connection as MarketplaceConnection,
          listing.marketplace_listing_id
        );

        if (status !== listing.status) {
          await supabase
            .from("listings")
            .update({
              status,
              ...(status === "sold" ? { sold_at: new Date().toISOString() } : {}),
            })
            .eq("id", listing.id);

          if (status === "sold" && listing.card_id) {
            sold.push(listing.card_id);
          }
        }
        synced++;
      } catch {
        // Skip failed syncs
      }
    }

    // Auto-delist sold cards from other marketplaces
    for (const cardId of sold) {
      const { data: otherListings } = await supabase
        .from("listings")
        .select("*")
        .eq("card_id", cardId)
        .eq("user_id", user.id)
        .eq("status", "active");

      for (const other of otherListings || []) {
        const conn = connectionMap.get(other.marketplace);
        if (conn && other.marketplace_listing_id) {
          try {
            const provider = getProvider(other.marketplace);
            await provider.cancelListing(
              conn as MarketplaceConnection,
              other.marketplace_listing_id
            );
          } catch {
            // Best effort
          }
        }
        await supabase
          .from("listings")
          .update({ status: "cancelled" })
          .eq("id", other.id);
      }

      // Update card status to sold
      await supabase
        .from("cards")
        .update({ status: "sold" })
        .eq("id", cardId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ synced, soldCards: sold.length });
  });
}
