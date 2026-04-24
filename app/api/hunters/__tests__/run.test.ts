import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSupabaseMock } from "@/__tests__/mocks/supabase-mock";

const mockState = {
  search: null as unknown,
  connection: { access_token: "tok", is_active: true } as unknown,
  searchListingsResults: [] as unknown[],
  searchListingsThrows: false as boolean | string,
  configuredMarketplaces: ["ebay"] as string[],
};

vi.mock("@/lib/api-helpers", () => ({
  withAuth: (handler: (user: { id: string }, supabase: unknown) => Promise<Response>) => {
    const sb = makeSupabaseMock({
      card_searches: { data: mockState.search ? [mockState.search] : [] },
      marketplace_connections: { data: [mockState.connection] },
      search_results: [
        { error: null }, // upserts
        { count: 5 }, // count query at the end
      ],
      notifications: { error: null },
    });
    return handler({ id: "user-123" }, sb.client);
  },
}));

vi.mock("@/lib/marketplaces/registry", () => ({
  getProvider: () => ({
    searchListings: vi.fn(async () => {
      if (mockState.searchListingsThrows) {
        throw new Error(
          typeof mockState.searchListingsThrows === "string"
            ? mockState.searchListingsThrows
            : "marketplace error"
        );
      }
      return mockState.searchListingsResults;
    }),
  }),
}));

vi.mock("@/lib/config", () => ({
  getConfiguredMarketplaces: () => mockState.configuredMarketplaces,
  isCardHedgeConfigured: () => false,
  isEbayConfigured: () => true,
  isTikTokConfigured: () => false,
}));

// Import AFTER mocks
import { POST } from "@/app/api/hunters/[id]/run/route";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/hunters/abc/run", {
    method: "POST",
  });
}

describe("POST /api/hunters/[id]/run", () => {
  beforeEach(() => {
    mockState.search = null;
    mockState.searchListingsResults = [];
    mockState.searchListingsThrows = false;
    mockState.configuredMarketplaces = ["ebay"];
    mockState.connection = { access_token: "tok", is_active: true };
  });

  it("returns 404 when search doesn't exist", async () => {
    mockState.search = null;
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe("Search not found");
  });

  it("returns marketplace_not_configured when no marketplaces are set up", async () => {
    mockState.search = {
      id: "abc",
      user_id: "user-123",
      filters: { athlete: "LeBron" },
      max_price_cents: null,
      marketplaces: [],
    };
    mockState.configuredMarketplaces = [];
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await res.json();
    expect(body.error).toBe("marketplace_not_configured");
    expect(body.newResults).toBe(0);
  });

  it("returns marketplace_not_configured when search-selected marketplaces are unavailable", async () => {
    mockState.search = {
      id: "abc",
      user_id: "user-123",
      filters: { athlete: "LeBron" },
      max_price_cents: null,
      marketplaces: ["tiktok"], // selected but not configured
    };
    mockState.configuredMarketplaces = ["ebay"]; // only eBay configured
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await res.json();
    expect(body.error).toBe("marketplace_not_configured");
  });

  it("runs search and returns newResults count when marketplace returns listings", async () => {
    mockState.search = {
      id: "abc",
      user_id: "user-123",
      name: "LeBron rookies",
      filters: { athlete: "LeBron James", year_min: 2003, year_max: 2003 },
      max_price_cents: 5000,
      marketplaces: ["ebay"],
    };
    mockState.searchListingsResults = [
      {
        marketplace_listing_id: "1",
        listing_url: "https://ebay.com/1",
        title: "LeBron 2003 RC",
        price_cents: 4500,
        image_url: null,
        seller_name: "alice",
      },
      {
        marketplace_listing_id: "2",
        listing_url: "https://ebay.com/2",
        title: "LeBron 2003 RC #2",
        price_cents: 3000,
        image_url: null,
        seller_name: "bob",
      },
    ];
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.newResults).toBe(2);
    expect(body.errors).toEqual([]);
    expect(body.query).toContain("LeBron James");
    expect(body.query).toContain("2003");
  });

  it("captures marketplace errors per-marketplace instead of swallowing them", async () => {
    mockState.search = {
      id: "abc",
      user_id: "user-123",
      name: "test",
      filters: { athlete: "LeBron" },
      max_price_cents: null,
      marketplaces: ["ebay"],
    };
    mockState.searchListingsThrows = "eBay API rate limit hit";
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await res.json();
    expect(res.status).toBe(200); // overall request succeeds even if a marketplace errors
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].marketplace).toBe("ebay");
    expect(body.errors[0].message).toContain("rate limit");
  });

  it("falls back to all configured marketplaces when search.marketplaces is empty", async () => {
    mockState.search = {
      id: "abc",
      user_id: "user-123",
      name: "test",
      filters: { athlete: "LeBron" },
      max_price_cents: null,
      marketplaces: [], // none specified
    };
    mockState.configuredMarketplaces = ["ebay"];
    mockState.searchListingsResults = [
      {
        marketplace_listing_id: "1",
        listing_url: "https://ebay.com/1",
        title: "x",
        price_cents: 100,
        image_url: null,
        seller_name: null,
      },
    ];
    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await res.json();
    expect(body.newResults).toBe(1);
  });
});
