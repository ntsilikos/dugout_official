import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getProvider } from "@/lib/marketplaces/registry";
import type { MarketplaceConnection } from "@/lib/marketplaces/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: listing } = await supabase
      .from("listings")
      .select("*, cards(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    return NextResponse.json({ listing });
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const body = await request.json();

    const { data: listing } = await supabase
      .from("listings")
      .update({
        title: body.title,
        description: body.description,
        price_cents: body.price_cents,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    return NextResponse.json({ listing });
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return withAuth(async (user, supabase) => {
    const { data: listing } = await supabase
      .from("listings")
      .select("*, marketplace_connections!inner(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Cancel on marketplace if active
    if (
      listing.status === "active" &&
      listing.marketplace_listing_id
    ) {
      try {
        const { data: connection } = await supabase
          .from("marketplace_connections")
          .select("*")
          .eq("user_id", user.id)
          .eq("marketplace", listing.marketplace)
          .single();

        if (connection) {
          const provider = getProvider(listing.marketplace);
          await provider.cancelListing(
            connection as MarketplaceConnection,
            listing.marketplace_listing_id
          );
        }
      } catch {
        // Log but don't block deletion
      }
    }

    await supabase
      .from("listings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  });
}
