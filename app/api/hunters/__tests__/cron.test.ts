import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { makeSupabaseMock } from "@/__tests__/mocks/supabase-mock";

const SECRET = "test-cron-secret";

const mockState = {
  searches: [] as unknown[],
  searchListingsResults: [] as unknown[],
  configuredMarketplaces: ["ebay"] as string[],
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const sb = makeSupabaseMock({
      card_searches: { data: mockState.searches },
      marketplace_connections: { data: [{ access_token: "x", is_active: true }] },
      search_results: [
        { error: null }, // for upserts during loop
        { error: null },
        { error: null },
        { count: mockState.searchListingsResults.length }, // count query
      ],
      notifications: { error: null },
    });
    return sb.client;
  },
}));

vi.mock("@/lib/marketplaces/registry", () => ({
  getProvider: () => ({
    searchListings: vi.fn(async () => mockState.searchListingsResults),
  }),
}));

vi.mock("@/lib/config", () => ({
  getConfiguredMarketplaces: () => mockState.configuredMarketplaces,
  isCardHedgeConfigured: () => false,
  isEbayConfigured: () => true,
  isTikTokConfigured: () => false,
}));

import { GET, POST } from "@/app/api/hunters/cron/route";

function makeRequest(headers: Record<string, string> = {}, method = "POST"): NextRequest {
  return new NextRequest("http://localhost/api/hunters/cron", {
    method,
    headers: new Headers(headers),
  });
}

describe("Cron /api/hunters/cron", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    mockState.searches = [];
    mockState.searchListingsResults = [];
    mockState.configuredMarketplaces = ["ebay"];
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("rejects unauthorized requests (no secret)", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("rejects unauthorized requests (wrong secret)", async () => {
    const res = await POST(makeRequest({ "x-cron-secret": "wrong" }));
    expect(res.status).toBe(401);
  });

  it("accepts x-cron-secret header (external schedulers)", async () => {
    const res = await POST(makeRequest({ "x-cron-secret": SECRET }));
    expect(res.status).toBe(200);
  });

  it("accepts Authorization: Bearer header (Vercel Cron)", async () => {
    const res = await POST(makeRequest({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
  });

  it("accepts GET requests (Vercel Cron only sends GET)", async () => {
    const res = await GET(makeRequest({ authorization: `Bearer ${SECRET}` }, "GET"));
    expect(res.status).toBe(200);
  });

  it("returns processed=0 when there are no active searches", async () => {
    mockState.searches = [];
    const res = await POST(makeRequest({ "x-cron-secret": SECRET }));
    const body = await res.json();
    expect(body.processed).toBe(0);
  });

  it("processes each active search", async () => {
    mockState.searches = [
      {
        id: "s1",
        user_id: "u1",
        name: "Search 1",
        filters: { athlete: "LeBron" },
        max_price_cents: 5000,
        marketplaces: ["ebay"],
      },
      {
        id: "s2",
        user_id: "u2",
        name: "Search 2",
        filters: { athlete: "Mahomes", autographed: true },
        max_price_cents: null,
        marketplaces: ["ebay"],
      },
    ];
    mockState.searchListingsResults = [
      {
        marketplace_listing_id: "x",
        listing_url: "https://ebay.com/x",
        title: "x",
        price_cents: 100,
        image_url: null,
        seller_name: null,
      },
    ];
    const res = await POST(makeRequest({ "x-cron-secret": SECRET }));
    const body = await res.json();
    expect(body.processed).toBe(2);
  });

  it("returns 0 processed when no marketplaces are configured", async () => {
    mockState.configuredMarketplaces = [];
    const res = await POST(makeRequest({ "x-cron-secret": SECRET }));
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(body.message).toMatch(/no marketplaces/i);
  });
});
