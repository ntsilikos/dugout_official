import type {
  MarketplaceProvider,
  MarketplaceTokens,
  MarketplaceConnection,
  ListingData,
  MarketplaceListingResult,
  MarketplaceSearchQuery,
  MarketplaceSearchResult,
} from "./types";

const TIKTOK_AUTH_URL = "https://services.tiktokshop.com/open/authorize";
const TIKTOK_TOKEN_URL = "https://auth.tiktok-shops.com/api/v2/token/get";
const TIKTOK_API_BASE = "https://open-api.tiktokglobalshop.com";

export class TikTokProvider implements MarketplaceProvider {
  name = "TikTok Shop";
  id = "tiktok";
  icon = "TT";

  getAuthUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      app_key: process.env.TIKTOK_APP_KEY!,
      state,
      redirect_uri: redirectUri,
    });
    return `${TIKTOK_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<MarketplaceTokens> {
    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: process.env.TIKTOK_APP_KEY!,
        app_secret: process.env.TIKTOK_APP_SECRET!,
        auth_code: code,
        grant_type: "authorized_code",
      }),
    });

    const data = await response.json();
    const tokenData = data.data;

    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(
        Date.now() + tokenData.access_token_expire_in * 1000
      ).toISOString(),
      marketplace_user_id: tokenData.open_id,
    };
  }

  async refreshToken(
    connection: MarketplaceConnection
  ): Promise<MarketplaceTokens> {
    const response = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app_key: process.env.TIKTOK_APP_KEY!,
        app_secret: process.env.TIKTOK_APP_SECRET!,
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const data = await response.json();
    const tokenData = data.data;

    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: new Date(
        Date.now() + tokenData.access_token_expire_in * 1000
      ).toISOString(),
    };
  }

  async createListing(
    connection: MarketplaceConnection,
    data: ListingData
  ): Promise<MarketplaceListingResult> {
    const response = await fetch(`${TIKTOK_API_BASE}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tts-access-token": connection.access_token!,
      },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category_id: "601226", // Trading Cards category (approximate)
        brand_id: undefined,
        images: data.images.map((img) => ({ url: img.url })),
        skus: [
          {
            price: {
              amount: (data.priceCents / 100).toFixed(2),
              currency: data.currency,
            },
            inventory: [{ quantity: data.quantity }],
          },
        ],
      }),
    });

    const result = await response.json();
    const productId = result.data?.product_id || "";

    return {
      marketplace_listing_id: productId,
      marketplace_url: `https://www.tiktok.com/view/product/${productId}`,
      status: "active",
    };
  }

  async cancelListing(
    connection: MarketplaceConnection,
    marketplaceListingId: string
  ): Promise<void> {
    await fetch(
      `${TIKTOK_API_BASE}/api/products/${marketplaceListingId}/deactivate`,
      {
        method: "POST",
        headers: {
          "x-tts-access-token": connection.access_token!,
        },
      }
    );
  }

  async getListingStatus(
    connection: MarketplaceConnection,
    marketplaceListingId: string
  ): Promise<string> {
    const response = await fetch(
      `${TIKTOK_API_BASE}/api/products/${marketplaceListingId}`,
      {
        headers: {
          "x-tts-access-token": connection.access_token!,
        },
      }
    );
    const data = await response.json();
    const status = data.data?.status;
    if (status === 4) return "sold";
    if (status === 1) return "active";
    return "ended";
  }

  async searchListings(
    connection: MarketplaceConnection,
    query: MarketplaceSearchQuery
  ): Promise<MarketplaceSearchResult[]> {
    // TikTok Shop's search API is limited; return empty for now
    // Will implement when their search API becomes more accessible
    void connection;
    void query;
    return [];
  }
}
