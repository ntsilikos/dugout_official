import eBayApi from "ebay-api";
import type {
  MarketplaceProvider,
  MarketplaceTokens,
  MarketplaceConnection,
  ListingData,
  MarketplaceListingResult,
  MarketplaceSearchQuery,
  MarketplaceSearchResult,
} from "./types";

function createEbayClient(connection?: MarketplaceConnection) {
  const client = new eBayApi({
    appId: process.env.EBAY_APP_ID!,
    certId: process.env.EBAY_CERT_ID!,
    devId: process.env.EBAY_DEV_ID!,
    sandbox: process.env.EBAY_SANDBOX === "true",
    siteId: eBayApi.SiteId.EBAY_US,
    ruName: process.env.EBAY_REDIRECT_URI!,
  });

  if (connection?.access_token) {
    client.auth.oAuth2.setCredentials({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token || "",
      expires_in: 7200,
    });
  }

  return client;
}

export class EbayProvider implements MarketplaceProvider {
  name = "eBay";
  id = "ebay";
  icon = "eB";

  getAuthUrl(redirectUri: string, state: string): string {
    const sandbox = process.env.EBAY_SANDBOX === "true";
    const baseUrl = sandbox
      ? "https://auth.sandbox.ebay.com/oauth2/authorize"
      : "https://auth.ebay.com/oauth2/authorize";
    const scopes = [
      "https://api.ebay.com/oauth/api_scope",
      "https://api.ebay.com/oauth/api_scope/sell.inventory",
      "https://api.ebay.com/oauth/api_scope/sell.fulfillment",
      "https://api.ebay.com/oauth/api_scope/sell.account",
    ];
    const params = new URLSearchParams({
      client_id: process.env.EBAY_APP_ID!,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
    });
    return `${baseUrl}?${params.toString()}`;
  }

  async exchangeCode(
    code: string,
  ): Promise<MarketplaceTokens> {
    const client = createEbayClient();
    const token = await client.auth.oAuth2.getToken(code) as Record<string, unknown>;
    return {
      access_token: String(token.access_token || ""),
      refresh_token: String(token.refresh_token || ""),
      token_expires_at: new Date(
        Date.now() + (Number(token.expires_in) || 7200) * 1000
      ).toISOString(),
    };
  }

  async refreshToken(
    connection: MarketplaceConnection
  ): Promise<MarketplaceTokens> {
    const client = createEbayClient(connection);
    const token = await client.auth.oAuth2.refreshToken() as Record<string, unknown>;
    return {
      access_token: String(token.access_token || ""),
      refresh_token: String(token.refresh_token || connection.refresh_token || ""),
      token_expires_at: new Date(
        Date.now() + (Number(token.expires_in) || 7200) * 1000
      ).toISOString(),
    };
  }

  async createListing(
    connection: MarketplaceConnection,
    data: ListingData
  ): Promise<MarketplaceListingResult> {
    const client = createEbayClient(connection);
    const sku = `CG-${Date.now()}`;
    const locationKey = "default-location";

    // Step 0: Ensure a default merchant location exists
    try {
      await client.sell.inventory.createInventoryLocation(locationKey, {
        location: {
          address: {
            country: "US",
            postalCode: "10001",
            stateOrProvince: "NY",
          },
        },
        locationTypes: ["WAREHOUSE"],
        name: "Default Location",
        merchantLocationStatus: "ENABLED",
      });
    } catch {
      // Location already exists — that's fine
    }

    // Step 1: Create inventory item
    await client.sell.inventory.createOrReplaceInventoryItem(sku, {
      availability: {
        shipToLocationAvailability: { quantity: data.quantity },
      },
      condition: data.condition === "graded" ? "LIKE_NEW" : "USED_EXCELLENT",
      product: {
        title: data.title,
        description: data.description,
        imageUrls: data.images.map((img) => img.url),
      },
    });

    // Step 2: Create offer with location
    const offer = await client.sell.inventory.createOffer({
      sku,
      marketplaceId: "EBAY_US",
      format: "FIXED_PRICE",
      listingDuration: "GTC",
      merchantLocationKey: locationKey,
      pricingSummary: {
        price: {
          value: (data.priceCents / 100).toFixed(2),
          currency: data.currency,
        },
      },
      categoryId: "261328", // Sports Trading Card Singles
    });

    // Step 3: Publish offer
    const published = await client.sell.inventory.publishOffer(offer.offerId);

    const sandbox = process.env.EBAY_SANDBOX === "true";
    const ebayDomain = sandbox ? "sandbox.ebay.com" : "www.ebay.com";

    return {
      marketplace_listing_id: published.listingId || offer.offerId,
      marketplace_url: `https://${ebayDomain}/itm/${published.listingId || ""}`,
      status: "active",
    };
  }

  async cancelListing(
    connection: MarketplaceConnection,
    marketplaceListingId: string
  ): Promise<void> {
    const client = createEbayClient(connection);
    await client.trading.EndItem({
      ItemID: marketplaceListingId,
      EndingReason: "NotAvailable",
    });
  }

  async getListingStatus(
    connection: MarketplaceConnection,
    marketplaceListingId: string
  ): Promise<string> {
    const client = createEbayClient(connection);
    try {
      const item = await client.buy.browse.getItem(
        `v1|${marketplaceListingId}|0`
      );
      if (item.estimatedAvailabilities?.[0]?.estimatedAvailableQuantity === 0) {
        return "sold";
      }
      return "active";
    } catch {
      return "ended";
    }
  }

  async searchListings(
    _connection: MarketplaceConnection,
    query: MarketplaceSearchQuery
  ): Promise<MarketplaceSearchResult[]> {
    const client = createEbayClient();
    // Browse API uses app-level auth (no user token needed)
    await client.auth.oAuth2.getAccessToken();

    const filters: string[] = ["categoryIds:{261328}"];
    if (query.minPrice)
      filters.push(`price:[${(query.minPrice / 100).toFixed(2)}]`);
    if (query.maxPrice)
      filters.push(`price:[..${(query.maxPrice / 100).toFixed(2)}]`);

    const response = await client.buy.browse.search({
      q: query.keyword,
      filter: filters.join(","),
      limit: "50",
    });

    return (response.itemSummaries || []).map(
      (item: {
        itemId?: string;
        itemWebUrl?: string;
        title?: string;
        price?: { value?: string };
        image?: { imageUrl?: string };
        seller?: { username?: string };
      }) => ({
        marketplace_listing_id: item.itemId || "",
        listing_url: item.itemWebUrl || "",
        title: item.title || "",
        price_cents: Math.round(parseFloat(item.price?.value || "0") * 100),
        image_url: item.image?.imageUrl || null,
        seller_name: item.seller?.username || null,
      })
    );
  }
}
