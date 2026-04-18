export interface MarketplaceProvider {
  name: string;
  id: string;
  icon: string;
  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<MarketplaceTokens>;
  refreshToken(connection: MarketplaceConnection): Promise<MarketplaceTokens>;
  createListing(
    connection: MarketplaceConnection,
    data: ListingData
  ): Promise<MarketplaceListingResult>;
  cancelListing(
    connection: MarketplaceConnection,
    marketplaceListingId: string
  ): Promise<void>;
  getListingStatus(
    connection: MarketplaceConnection,
    marketplaceListingId: string
  ): Promise<string>;
  searchListings(
    connection: MarketplaceConnection,
    query: MarketplaceSearchQuery
  ): Promise<MarketplaceSearchResult[]>;
}

export interface MarketplaceTokens {
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  marketplace_user_id?: string;
  marketplace_username?: string;
}

export interface MarketplaceConnection {
  id: string;
  user_id: string;
  marketplace: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  marketplace_user_id: string | null;
  marketplace_username: string | null;
  is_active: boolean;
  connected_at: string;
  updated_at: string;
}

export interface ListingData {
  title: string;
  description: string;
  priceCents: number;
  currency: string;
  quantity: number;
  images: { url: string; isPrimary: boolean }[];
  condition: "raw" | "graded";
  gradeCompany?: string;
  gradeValue?: number;
  sport?: string;
  playerName?: string;
  year?: number;
  brand?: string;
  setName?: string;
  cardNumber?: string;
}

export interface MarketplaceListingResult {
  marketplace_listing_id: string;
  marketplace_url: string;
  status: string;
}

export interface MarketplaceSearchQuery {
  keyword: string;
  sport?: string;
  minPrice?: number;
  maxPrice?: number;
  grader?: string;
  minGrade?: number;
  maxGrade?: number;
}

export interface MarketplaceSearchResult {
  marketplace_listing_id: string;
  listing_url: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  seller_name: string | null;
}
