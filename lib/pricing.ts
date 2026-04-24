import eBayApi from "ebay-api";
import {
  getAllPricesByCard,
  getComps,
  getPriceEstimate,
  imageSearch,
  matchCard,
  type CardMatch,
  type PriceEstimate,
} from "./cardhedge";
import { isCardHedgeConfigured, isEbayConfigured } from "./config";
import { createAdminClient } from "./supabase/admin";

// Grading companies that CardHedge recognizes
const KNOWN_GRADERS = new Set(["PSA", "BGS", "SGC", "CGC", "CSG", "HGA"]);
const TITLE_STOP_WORDS = new Set([
  "the",
  "of",
  "and",
  "a",
  "an",
  "in",
  "on",
  "for",
  "card",
  "cards",
  "series",
  "base",
  "edition",
]);

function isRealGrade(company: string | null | undefined): boolean {
  return !!company && KNOWN_GRADERS.has(company.toUpperCase());
}

interface CompResult {
  title: string;
  price_cents: number;
  sold_date: string;
  condition: string;
  image_url: string | null;
  listing_url: string;
  is_sold?: boolean; // true = actual sold sale (Marketplace Insights); false/undefined = active listing
}

export type AppraisalTier = "strict" | "no-card-#" | "year+player only";

export interface CompSummary {
  comps: CompResult[];
  average_cents: number;
  median_cents: number;
  low_cents: number;
  high_cents: number;
  count: number;
  query: string;
  source?: "cardhedge" | "ebay";
  cardhedge_card_id?: string;
  cardhedge_match?: CardMatch;
  price_estimate?: PriceEstimate;
  // Confidence metadata — populated by fetchCompsEbay so the appraise endpoint
  // can decide whether to auto-accept, flag for review, or skip the card.
  tier?: AppraisalTier;
  coefficient_of_variation?: number; // std-dev / mean of trimmed prices
  sold_count?: number; // actual sold comps (Marketplace Insights) — more trustworthy
  active_count?: number; // active listings — asking prices, less trustworthy
}

type CardInput = {
  player_name?: string | null;
  year?: number | null;
  brand?: string | null;
  set_name?: string | null;
  card_number?: string | null;
  variant?: string | null;
  cardhedge_card_id?: string | null;
  grade_company?: string | null;
  grade_value?: number | null;
  condition?: string | null;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeMatchText(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleHasTerm(normalizedTitle: string, term: string): boolean {
  const normalizedTerm = normalizeMatchText(term);
  if (!normalizedTerm) return false;
  return new RegExp(`(^|\\s)${escapeRegExp(normalizedTerm)}(?=\\s|$)`, "i").test(
    normalizedTitle
  );
}

function getDistinctiveTokens(...parts: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      parts
        .flatMap((part) => normalizeMatchText(part).split(/\s+/))
        .filter((token) => token.length > 2 && !TITLE_STOP_WORDS.has(token))
    )
  );
}

function getSearchVariant(variant: string | null | undefined): string | null {
  const normalized = variant?.trim();
  if (!normalized) return null;
  if (/^(base|raw|standard)$/i.test(normalized)) return null;
  return normalized;
}

function getCardNumber(cardNumber: string | null | undefined): string | null {
  const normalized = cardNumber?.replace(/^#/, "").trim();
  return normalized || null;
}

function formatTitleForLog(title: string): string {
  const compact = title.replace(/\s+/g, " ").trim();
  const clipped = compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
  return JSON.stringify(clipped);
}

export function buildCardQuery(card: CardInput): string {
  // If set_name already contains the brand, skip brand to avoid "Topps Topps Series 1"
  const brandStr = card.brand || "";
  const setStr = card.set_name || "";
  const skipBrand = setStr.toLowerCase().includes(brandStr.toLowerCase()) && brandStr.length > 0;
  const variantStr = getSearchVariant(card.variant);
  const cardNumber = getCardNumber(card.card_number);

  const parts: (string | number | null | false | undefined)[] = [
    card.year,
    skipBrand ? null : brandStr,
    setStr,
    variantStr,
    card.player_name,
    cardNumber ? `#${cardNumber}` : null,
    isRealGrade(card.grade_company) && card.grade_value
      ? `${card.grade_company} ${card.grade_value}`
      : null,
  ];

  return parts.filter(Boolean).join(" ");
}

export function cardGradeString(card: {
  grade_company?: string | null;
  grade_value?: number | null;
  condition?: string | null;
}): string {
  if (isRealGrade(card.grade_company) && card.grade_value) {
    return `${card.grade_company} ${card.grade_value}`;
  }
  return "Raw";
}

// ---- eBay Browse API fallback ----

function createEbayBrowseClient() {
  return new eBayApi({
    appId: process.env.EBAY_APP_ID!,
    certId: process.env.EBAY_CERT_ID!,
    devId: process.env.EBAY_DEV_ID!,
    sandbox: process.env.EBAY_SANDBOX === "true",
    siteId: eBayApi.SiteId.EBAY_US,
  });
}

// ---- eBay Marketplace Insights API (sold listings) ----
// Returns ACTUAL sold prices from the last 90 days. More accurate than
// active Browse listings (which are just asking prices). Requires the
// `buy.marketplace.insights` scope, which eBay grants on application.
// Falls back gracefully when scope isn't available.

let cachedInsightsToken: { token: string; expiresAt: number } | null = null;

async function getInsightsToken(): Promise<string | null> {
  // Reuse cached token until 60s before expiry
  if (cachedInsightsToken && cachedInsightsToken.expiresAt > Date.now() + 60_000) {
    return cachedInsightsToken.token;
  }

  const sandbox = process.env.EBAY_SANDBOX === "true";
  const tokenUrl = sandbox
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token";

  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString("base64");

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope/buy.marketplace.insights",
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.log(
        `[ebay-insights] Token fetch failed (${res.status}): ${txt.slice(0, 200)}`
      );
      return null;
    }

    const data = await res.json();
    cachedInsightsToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 7200) * 1000,
    };
    return data.access_token;
  } catch (err) {
    console.log(
      `[ebay-insights] Token error: ${err instanceof Error ? err.message : "unknown"}`
    );
    return null;
  }
}

async function fetchSoldCompsEbay(query: string): Promise<CompResult[]> {
  const token = await getInsightsToken();
  if (!token) return [];

  const sandbox = process.env.EBAY_SANDBOX === "true";
  const baseUrl = sandbox
    ? "https://api.sandbox.ebay.com"
    : "https://api.ebay.com";
  const searchUrl = `${baseUrl}/buy/marketplace_insights/v1_beta/item_sales/search?q=${encodeURIComponent(query)}&limit=100`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      console.log(
        `[ebay-insights] Search failed for "${query}" (${res.status}): ${txt.slice(0, 200)}`
      );
      return [];
    }

    const data = await res.json();
    const sales = data.itemSales || [];
    return sales.map(
      (item: {
        title?: string;
        lastSoldPrice?: { value?: string };
        lastSoldDate?: string;
        condition?: string;
        image?: { imageUrl?: string };
        itemWebUrl?: string;
      }) => ({
        title: item.title || "",
        price_cents: Math.round(parseFloat(item.lastSoldPrice?.value || "0") * 100),
        sold_date: item.lastSoldDate || new Date().toISOString(),
        condition: item.condition || "Unknown",
        image_url: item.image?.imageUrl || null,
        listing_url: item.itemWebUrl || "",
        is_sold: true,
      })
    );
  } catch (err) {
    console.log(
      `[ebay-insights] Search error for "${query}": ${err instanceof Error ? err.message : "unknown"}`
    );
    return [];
  }
}

// Build progressively simpler query variations to try in order.
// Multi-player cards, obscure sets, or specific numbering often fail
// on the detailed query but succeed with a simpler one.
function buildQueryVariations(card: CardInput): string[] {
  const variations: string[] = [];
  const brandStr = card.brand || "";
  const setStr = card.set_name || "";
  const skipBrand =
    setStr.toLowerCase().includes(brandStr.toLowerCase()) && brandStr.length > 0;
  const variantStr = getSearchVariant(card.variant);
  const cardNumber = getCardNumber(card.card_number);

  // Extract first player from multi-player cards (e.g., "Durant, Roy, Okafor, James" → "Durant")
  const firstPlayer = card.player_name?.split(",")[0]?.trim() || "";
  const setCore = [skipBrand ? null : brandStr, setStr, variantStr]
    .filter(Boolean)
    .join(" ");

  // Variation 1: Full detailed query
  const full = [
    card.year,
    setCore,
    card.player_name,
    cardNumber && `#${cardNumber}`,
  ]
    .filter(Boolean)
    .join(" ");
  if (full.trim()) variations.push(full);

  // Variation 2: Year + set/brand + all players (no card number)
  if (card.year && setCore && card.player_name) {
    variations.push(`${card.year} ${setCore} ${card.player_name}`);
  }

  // Variation 3: Year + set/brand + first player only (for multi-player cards)
  if (card.year && setCore && firstPlayer && firstPlayer !== card.player_name) {
    variations.push(`${card.year} ${setCore} ${firstPlayer}`);
  }

  // Variation 4: Year + brand + first player only
  if (card.year && firstPlayer) {
    const broad = [card.year, skipBrand ? null : brandStr, firstPlayer]
      .filter(Boolean)
      .join(" ");
    variations.push(broad);
  }

  // De-dup and return
  return Array.from(new Set(variations)).filter((q) => q.trim().length > 0);
}

// Detect a grade mention in an eBay title.
// Matches "PSA 10", "PSA10", "BGS 9.5", "SGC 9", etc. — any real grader
// followed by an optional space and a numeric grade.
const GRADE_REGEX = /\b(PSA|BGS|SGC|CGC|CSG|HGA)\s*(\d+(?:\.\d+)?)\b/i;

function extractGrade(
  title: string
): { company: string; value: number } | null {
  const m = title.match(GRADE_REGEX);
  if (!m) return null;
  return { company: m[1].toUpperCase(), value: parseFloat(m[2]) };
}

// Strict title filter — reject eBay listings whose titles clearly describe
// a different card (wrong year, wrong card number, wrong set, etc).
// Be aggressive: false rejections are better than false matches, since a
// false match creates a misleading price while a false rejection is visible.
// Exported for direct unit testing of the grade/year/set/player checks.
export function listingTitleMatches(
  title: string,
  card: CardInput
): { matches: boolean; reason?: string; matchedChecks: string[] } {
  const normalizedTitle = normalizeMatchText(title);
  const rawTitle = title.toLowerCase();
  const matchedChecks: string[] = [];

  // ---- Grade check ----
  // Huge accuracy lever: raw cards and graded cards command wildly different
  // prices, so a filter that ignores grade will mix PSA 10s into a raw card's
  // comp pool and produce a garbage average.
  //
  // - Graded card: title MUST contain the same grade company + value.
  //   (A PSA 9 card can't use PSA 10 comps.)
  // - Raw card: reject any listing that explicitly mentions a grade.
  //   (Raw cards shouldn't be priced off graded sales.)
  const listingGrade = extractGrade(title);
  const cardIsGraded = isRealGrade(card.grade_company) && !!card.grade_value;
  if (cardIsGraded) {
    if (!listingGrade) {
      return {
        matches: false,
        reason: `ungraded listing (need ${card.grade_company} ${card.grade_value})`,
        matchedChecks,
      };
    }
    if (
      listingGrade.company !== card.grade_company?.toUpperCase() ||
      listingGrade.value !== card.grade_value
    ) {
      return {
        matches: false,
        reason: `grade mismatch (listing is ${listingGrade.company} ${listingGrade.value}, want ${card.grade_company} ${card.grade_value})`,
        matchedChecks,
      };
    }
    matchedChecks.push(`grade ${card.grade_company} ${card.grade_value}`);
  } else if (listingGrade) {
    return {
      matches: false,
      reason: `graded listing (${listingGrade.company} ${listingGrade.value}) for raw card`,
      matchedChecks,
    };
  }

  // ---- Year check ----
  // Require the card's year to appear, either as a standalone 4-digit year
  // or as the start/end of a "YYYY-YY" season range.
  if (card.year) {
    const year = String(card.year);
    const prevYear = String(card.year - 1);
    const seasonPrev = `${prevYear}-${year.slice(-2)}`; // "2003-04"
    const seasonCurr = `${year}-${String(card.year + 1).slice(-2)}`; // "2004-05"

    // Strip "X of Y" subset references first — "Card 15 of 23" should not count
    // for year/number matching. We keep them out of the year check.
    const tForYear = rawTitle.replace(/\b\d+\s*of\s*\d+\b/g, " ");

    const hasYear =
      new RegExp(`(^|\\D)${escapeRegExp(year)}(?=\\D|$)`).test(tForYear) ||
      new RegExp(`(^|\\D)${escapeRegExp(seasonPrev)}(?=\\D|$)`).test(tForYear) ||
      new RegExp(`(^|\\D)${escapeRegExp(seasonCurr)}(?=\\D|$)`).test(tForYear) ||
      new RegExp(
        `(^|\\D)${escapeRegExp(prevYear)}[-/]${escapeRegExp(year.slice(-2))}(?=\\D|$)`
      ).test(tForYear) ||
      new RegExp(
        `(^|\\D)${escapeRegExp(year)}[-/]${escapeRegExp(
          String(card.year + 1).slice(-2)
        )}(?=\\D|$)`
      ).test(tForYear);
    if (!hasYear) {
      return { matches: false, reason: `missing year ${year}`, matchedChecks };
    }
    matchedChecks.push(`year ${year}`);
  }

  // ---- Card number check ----
  // MUST have an explicit # prefix or "no./card" marker. Bare numbers like
  // "Card 15 of 23" should NOT count as matching card #23.
  const num = getCardNumber(card.card_number);
  if (num) {
    const numPattern = new RegExp(
      `(?:#\\s*|\\bno\\.?\\s+|\\bcard\\s*#?\\s*)${escapeRegExp(num)}\\b(?!\\s*of\\b)`,
      "i"
    );
    if (!numPattern.test(title)) {
      return { matches: false, reason: `missing card #${num}`, matchedChecks };
    }
    matchedChecks.push(`card #${num}`);
  }

  // ---- Set name check ----
  // RELAXED: require at least ONE distinctive set/brand token, not all of them.
  // eBay listings abbreviate ("UD" for "Upper Deck", "RoY" for "Rookie of the Year"),
  // reorder words, and drop "the"/"of"/etc. A single token overlap is a strong signal
  // without over-filtering valid listings.
  if (card.set_name) {
    const fullPhrase = normalizeMatchText(card.set_name);
    const setTokens = getDistinctiveTokens(card.brand, card.set_name);
    const hasPhrase =
      fullPhrase.split(/\s+/).length >= 2 && titleHasTerm(normalizedTitle, fullPhrase);
    const foundTokens = setTokens.filter((token) =>
      titleHasTerm(normalizedTitle, token)
    );

    if (setTokens.length > 0 && !hasPhrase && foundTokens.length === 0) {
      return {
        matches: false,
        reason: `no set tokens found (looked for ${setTokens.join("/")})`,
        matchedChecks,
      };
    }
    if (setTokens.length > 0) {
      matchedChecks.push(
        hasPhrase
          ? `set phrase "${card.set_name}"`
          : `set tokens ${foundTokens.join("/")}`
      );
    }
  }

  // ---- Variant check ----
  // RELAXED: variant is informational only. Don't reject listings that omit it
  // (most eBay titles for base cards don't say "Base"; parallel titles may say
  // "Refractor" even if our variant is "Silver Refractor"). Just note it if found.
  const variant = getSearchVariant(card.variant);
  if (variant) {
    const variantTokens = getDistinctiveTokens(variant);
    const foundTokens = variantTokens.filter((token) =>
      titleHasTerm(normalizedTitle, token)
    );
    if (foundTokens.length > 0) {
      matchedChecks.push(`variant ${foundTokens.join("/")}`);
    }
  }

  // ---- Player check ----
  // Required: last name must appear. Allow first name to be missing since
  // titles often use nicknames or partial names.
  if (card.player_name) {
    const firstPlayer = card.player_name.split(",")[0].trim();
    const playerTokens = getDistinctiveTokens(firstPlayer);
    const lastNameToken = playerTokens[playerTokens.length - 1]; // last distinctive token is usually the last name

    if (lastNameToken && !titleHasTerm(normalizedTitle, lastNameToken)) {
      return {
        matches: false,
        reason: `missing player last name "${lastNameToken}"`,
        matchedChecks,
      };
    }
    if (playerTokens.length > 0) {
      matchedChecks.push(`player ${firstPlayer}`);
    }
  }

  return { matches: true, matchedChecks };
}

export async function fetchCompsEbay(card: CardInput): Promise<CompSummary> {
  const primaryQuery = buildCardQuery(card);
  const empty: CompSummary = {
    comps: [],
    average_cents: 0,
    median_cents: 0,
    low_cents: 0,
    high_cents: 0,
    count: 0,
    query: primaryQuery,
    source: "ebay",
  };

  const variations = buildQueryVariations(card);
  if (!variations.length) return empty;

  try {
    const client = createEbayBrowseClient();
    await client.auth.oAuth2.getAccessToken();

    // Pool results from ALL query variations into a deduped set.
    // The narrow query (full title) often returns wrong "first results";
    // the broader variations surface listings with cleaner titles
    // (e.g., "Rookie of the Year" instead of "Rookie of the Month").
    // Casting a wider net up front gives the strict filter much better odds.
    type EbayItem = {
      itemId?: string;
      title?: string;
      price?: { value?: string };
      itemEndDate?: string;
      condition?: string;
      image?: { imageUrl?: string };
      itemWebUrl?: string;
    };
    const seen = new Map<string, EbayItem>();
    const queriesUsed: string[] = [];

    for (const query of variations) {
      try {
        const response = await client.buy.browse.search({
          q: query,
          limit: "100", // eBay max for Browse — much bigger pool to filter from
        });
        const found: EbayItem[] = response.itemSummaries || [];
        let added = 0;
        for (const item of found) {
          const key = item.itemId || item.itemWebUrl || item.title || "";
          if (key && !seen.has(key)) {
            seen.set(key, item);
            added++;
          }
        }
        if (found.length > 0) {
          queriesUsed.push(query);
          console.log(
            `[ebay] Query "${query}" → ${found.length} results, ${added} new (pool size: ${seen.size})`
          );
        }
      } catch (err) {
        console.log(
          `[ebay] Query "${query}" errored: ${err instanceof Error ? err.message : "unknown"}`
        );
      }
    }

    const items: EbayItem[] = Array.from(seen.values());
    const usedQuery = queriesUsed.join(" | ") || primaryQuery;

    // Also fetch SOLD listings via Marketplace Insights API in parallel for each
    // variation. Sold prices are way more accurate than active asking prices.
    // If the scope isn't granted, this returns [] silently and we fall back to
    // active listings only.
    const soldComps: CompResult[] = [];
    const soldSeen = new Set<string>();
    for (const query of variations) {
      const sold = await fetchSoldCompsEbay(query);
      for (const comp of sold) {
        const key = comp.listing_url || comp.title;
        if (key && !soldSeen.has(key)) {
          soldSeen.add(key);
          soldComps.push(comp);
        }
      }
    }
    if (soldComps.length > 0) {
      console.log(`[ebay] Sold pool (Marketplace Insights): ${soldComps.length}`);
    }

    if (!items.length && !soldComps.length) {
      console.log(`[ebay] No results found for any variation of "${primaryQuery}"`);
      return { ...empty, query: usedQuery };
    }
    console.log(
      `[ebay] Total pool: ${items.length} active + ${soldComps.length} sold listings to filter`
    );

    // Convert active listings, then merge with sold (sold are already in CompResult shape)
    const activeComps: CompResult[] = items.map((item) => ({
      title: item.title || "",
      price_cents: Math.round(parseFloat(item.price?.value || "0") * 100),
      sold_date: item.itemEndDate || new Date().toISOString(),
      condition: item.condition || "Unknown",
      image_url: item.image?.imageUrl || null,
      listing_url: item.itemWebUrl || "",
      is_sold: false,
    }));
    const allComps: CompResult[] = [...soldComps, ...activeComps];

    // Tiered filtering: try strict first, then progressively relax.
    // The user's card metadata is often imperfect (AI misreads card numbers,
    // sets get abbreviated, etc) — better to surface relevant comps with a
    // looser match than to return zero results.
    const tiers: Array<{
      name: string;
      cardOverride: CardInput;
    }> = [
      // Tier 1: full strict match with card number
      { name: "strict", cardOverride: card },
      // Tier 2: drop card number — usually wrong in our metadata anyway
      // (e.g., "L32" vs eBay's "LJ32"). Year + player + set is plenty specific.
      { name: "no-card-#", cardOverride: { ...card, card_number: null } },
      // Tier 3: drop set tokens too — last resort, just year + player
      {
        name: "year+player only",
        cardOverride: { ...card, card_number: null, set_name: null, brand: null },
      },
    ];

    let filtered: CompResult[] = [];
    let usedTier = "strict";
    const rejectionReasons = new Map<string, number>(); // reason → count

    for (const tier of tiers) {
      filtered = [];
      rejectionReasons.clear();
      for (const comp of allComps) {
        const check = listingTitleMatches(comp.title, tier.cardOverride);
        if (check.matches) {
          filtered.push(comp);
        } else if (check.reason) {
          rejectionReasons.set(
            check.reason,
            (rejectionReasons.get(check.reason) || 0) + 1
          );
        }
      }
      if (filtered.length > 0) {
        usedTier = tier.name;
        console.log(
          `[ebay] Filter tier "${tier.name}": kept ${filtered.length}/${allComps.length}`
        );
        // Log a few accepted samples for visibility
        filtered.slice(0, 3).forEach((c) =>
          console.log(`[ebay] ACCEPTED: ${formatTitleForLog(c.title)}`)
        );
        break;
      }
      console.log(
        `[ebay] Filter tier "${tier.name}": 0 matches. Top reasons: ${Array.from(
          rejectionReasons.entries()
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([r, n]) => `${r} (${n})`)
          .join(", ")}`
      );
    }

    if (!filtered.length) {
      console.log(
        `[ebay] All filter tiers rejected listings for "${usedQuery}". Returning no comps.`
      );
      return { ...empty, query: usedQuery };
    }

    const comps = filtered;
    console.log(`[ebay] Final pool: ${comps.length} comps via "${usedTier}" tier`);

    // Filter out junk prices (too low = bulk lots, too high = outliers)
    const validPrices = comps
      .map((c) => c.price_cents)
      .filter((p) => p >= 100) // at least $1
      .sort((a, b) => a - b);

    // IQR-based outlier removal: any price outside [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
    // is a statistical outlier. Catches extreme values like $9,500 for a $50 card.
    let trimmed = validPrices;
    if (validPrices.length >= 4) {
      const q1 = validPrices[Math.floor(validPrices.length * 0.25)];
      const q3 = validPrices[Math.floor(validPrices.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = Math.max(0, q1 - 1.5 * iqr);
      const upperBound = q3 + 1.5 * iqr;
      trimmed = validPrices.filter((p) => p >= lowerBound && p <= upperBound);
    }

    // Coefficient of variation on trimmed prices — a tight cluster (CV < 0.3)
    // means the comps agree on a price. High CV means we're averaging across
    // very different card states and should flag the result for review.
    let cv: number | undefined;
    if (trimmed.length >= 2) {
      const mean = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
      if (mean > 0) {
        const variance =
          trimmed.reduce((acc, p) => acc + (p - mean) ** 2, 0) / trimmed.length;
        cv = Math.sqrt(variance) / mean;
      }
    }

    // Track sold (real sale prices from Marketplace Insights) vs active
    // (asking prices) within the FILTERED pool — sold prices are much more
    // trustworthy and boost confidence.
    const soldCount = comps.filter((c) => c.is_sold).length;
    const activeCount = comps.length - soldCount;

    return {
      comps,
      average_cents: trimmed.length
        ? Math.round(trimmed.reduce((a, b) => a + b, 0) / trimmed.length)
        : 0,
      median_cents: trimmed.length ? trimmed[Math.floor(trimmed.length / 2)] : 0,
      low_cents: trimmed.length ? trimmed[0] : 0,
      high_cents: trimmed.length ? trimmed[trimmed.length - 1] : 0,
      count: trimmed.length,
      query: usedQuery,
      source: "ebay",
      tier: usedTier as AppraisalTier,
      coefficient_of_variation: cv,
      sold_count: soldCount,
      active_count: activeCount,
    };
  } catch {
    return empty;
  }
}

// ---- CardHedge primary ----

async function buildCardHedgeSummary({
  cardId,
  query,
  grade,
  prices,
  match,
}: {
  cardId: string;
  query: string;
  grade: string;
  prices: { grade: string; price: string }[];
  match?: CardMatch;
}): Promise<CompSummary> {
  let compPrice = 0;
  let high = 0;
  let low = 0;
  let compCount = 0;
  try {
    const compsData = await getComps(cardId, grade, 10);
    compPrice = compsData.comp_price;
    high = compsData.high;
    low = compsData.low;
    compCount = compsData.count_used;
  } catch {
    // Comps may not be available
  }

  let estimate: PriceEstimate | undefined;
  try {
    estimate = await getPriceEstimate(cardId, grade);
  } catch {
    // Estimate may not be available
  }

  const comps: CompResult[] = prices.map((p) => ({
    title: match?.description ? `${match.description} ${p.grade}` : `CardHedge ${p.grade}`,
    price_cents: Math.round(parseFloat(p.price) * 100),
    sold_date: new Date().toISOString(),
    condition: p.grade,
    image_url: match?.image ? `https:${match.image}` : null,
    listing_url: "",
    is_sold: true, // CardHedge prices are aggregated from recent real sales
  }));

  const primaryPriceDollars = estimate?.price ?? compPrice;
  const primaryPriceCents = Math.round(primaryPriceDollars * 100);
  const highCents = Math.round((estimate?.price_high ?? high) * 100);
  const lowCents = Math.round((estimate?.price_low ?? low) * 100);

  return {
    comps,
    average_cents: primaryPriceCents,
    median_cents: primaryPriceCents,
    low_cents: lowCents,
    high_cents: highCents,
    count: compCount || comps.length,
    query,
    source: "cardhedge",
    cardhedge_card_id: cardId,
    cardhedge_match: match,
    price_estimate: estimate,
  };
}

async function fetchCompsCardHedge(card: CardInput): Promise<CompSummary> {
  const query = buildCardQuery(card);
  const empty: CompSummary = {
    comps: [],
    average_cents: 0,
    median_cents: 0,
    low_cents: 0,
    high_cents: 0,
    count: 0,
    query,
    source: "cardhedge",
  };

  if (!query.trim()) return empty;

  const matchResult = await matchCard(query);
  if (!matchResult.match || matchResult.match.confidence < 0.5) {
    return { ...empty, query: matchResult.search_query_used };
  }

  const match = matchResult.match;
  const grade = cardGradeString(card);
  console.log(
    `[cardhedge] MATCHED: ${JSON.stringify(match.description)} (${match.confidence.toFixed(
      2
    )}) for "${matchResult.search_query_used}"`
  );

  return buildCardHedgeSummary({
    cardId: match.card_id,
    query: matchResult.search_query_used,
    grade,
    prices: match.prices || [],
    match,
  });
}

// Download a user's primary card image and return it as base64.
// Used for CardHedge image-search verification.
async function downloadCardImageBase64(
  userId: string,
  cardId: string
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: cardImages } = await admin
      .from("card_images")
      .select("storage_path, is_primary, side")
      .eq("card_id", cardId)
      .eq("user_id", userId);

    const front =
      cardImages?.find((img) => img.side === "front" || img.is_primary) ||
      cardImages?.[0];
    if (!front?.storage_path) return null;

    const { data: blob } = await admin.storage
      .from("card-images")
      .download(front.storage_path);
    if (!blob) return null;

    const buffer = Buffer.from(await blob.arrayBuffer());
    return buffer.toString("base64");
  } catch {
    return null;
  }
}

// Resolve a CardHedge card_id via visual image-search — much more accurate
// than text matching because it actually compares the scanned photo against
// CardHedge's card-image database. Used by both the comps endpoint
// (for user-driven match verification) and the batch appraise endpoint.
//
// Returns the top match's card_id if similarity clears the threshold,
// along with any metadata corrections that should be written back.
export interface ResolvedCardIdentity {
  cardhedgeId: string | null;
  confidence: number;
  corrections: Record<string, unknown>;
  source: "image" | "text" | "none";
  description?: string;
}

export async function resolveCardhedgeIdForCard(
  userId: string,
  card: CardInput & { id?: string }
): Promise<ResolvedCardIdentity> {
  const none: ResolvedCardIdentity = {
    cardhedgeId: null,
    confidence: 0,
    corrections: {},
    source: "none",
  };

  if (!isCardHedgeConfigured()) return none;

  // Already have a verified ID — trust it
  if (card.cardhedge_card_id) {
    return {
      cardhedgeId: card.cardhedge_card_id,
      confidence: 1,
      corrections: {},
      source: "image",
    };
  }

  // ---- Layer 1: image search (most accurate) ----
  if (card.id) {
    const imageBase64 = await downloadCardImageBase64(userId, card.id);
    if (imageBase64) {
      try {
        const results = await imageSearch(imageBase64);
        const top = results.results?.[0];
        // Higher threshold (0.7) for batch/auto-accept since no user review
        if (top && top.similarity >= 0.7) {
          const yearMatch = top.set?.match(/^(\d{4})\s/);
          const correctedYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
          const setBrand = top.set
            ?.replace(/^\d{4}\s+/, "")
            .replace(/\s+(Baseball|Basketball|Football|Hockey|Soccer)$/i, "");

          const corrections: Record<string, unknown> = {
            cardhedge_card_id: top.card_id,
          };
          if (top.player) corrections.player_name = top.player;
          if (correctedYear) corrections.year = correctedYear;
          if (setBrand) corrections.brand = setBrand;
          if (top.set) corrections.set_name = top.set;
          if (top.number) corrections.card_number = top.number;
          if (top.variant) corrections.variant = top.variant;

          return {
            cardhedgeId: top.card_id,
            confidence: top.similarity,
            corrections,
            source: "image",
            description: top.description,
          };
        }
      } catch {
        // Image search failed, fall through to text match
      }
    }
  }

  // ---- Layer 2: text match (fallback when no image or image fails) ----
  const query = buildCardQuery(card);
  if (!query.trim()) return none;

  try {
    const matchResult = await matchCard(query);
    const m = matchResult.match;
    if (m && m.confidence >= 0.7) {
      const yearMatch = m.set?.match(/^(\d{4})\s/);
      const correctedYear = yearMatch ? parseInt(yearMatch[1]) : undefined;
      const setBrand = m.set
        ?.replace(/^\d{4}\s+/, "")
        .replace(/\s+(Baseball|Basketball|Football|Hockey|Soccer)$/i, "");

      const corrections: Record<string, unknown> = { cardhedge_card_id: m.card_id };
      if (m.player) corrections.player_name = m.player;
      if (correctedYear) corrections.year = correctedYear;
      if (setBrand) corrections.brand = setBrand;
      if (m.set) corrections.set_name = m.set;
      if (m.number) corrections.card_number = m.number;
      if (m.variant) corrections.variant = m.variant;
      if (m.category) corrections.sport = m.category;

      return {
        cardhedgeId: m.card_id,
        confidence: m.confidence,
        corrections,
        source: "text",
        description: m.description,
      };
    }
  } catch {
    // Text match failed too
  }

  return none;
}

async function fetchCompsCardHedgeById(card: CardInput): Promise<CompSummary> {
  const query = buildCardQuery(card);
  const cardId = card.cardhedge_card_id?.trim();
  const grade = cardGradeString(card);

  if (!cardId) {
    return {
      comps: [],
      average_cents: 0,
      median_cents: 0,
      low_cents: 0,
      high_cents: 0,
      count: 0,
      query,
      source: "cardhedge",
    };
  }

  let prices: { grade: string; price: string }[] = [];
  try {
    const allPrices = await getAllPricesByCard(cardId);
    prices = allPrices.prices || [];
  } catch {
    // Pricing by grade is optional; the estimate/comps endpoints can still succeed.
  }

  console.log(`[cardhedge] USING CONFIRMED CARD ID: ${cardId}`);
  return buildCardHedgeSummary({
    cardId,
    query,
    grade,
    prices,
  });
}

// ---- Appraisal confidence scoring ----
//
// Takes the raw comp summary from eBay and produces a trust verdict. The
// appraise endpoint uses this to decide whether to silently write the new
// price, flag the card for user review, or skip the write entirely.
//
// Inputs that move the score:
//   - Tier: strict (1.0) > no-card-# (0.7) > year+player only (0.4)
//     — broad-match tiers are much more likely to include wrong cards
//   - Comp count: more comps = more reliable average (caps at 8)
//   - Coefficient of variation: tight price cluster = high confidence
//   - Sold-vs-active ratio: actual sold prices > asking prices
//
// Output status:
//   - "verified"      confidence ≥ 0.7 → auto-write
//   - "needs_review"  0.45 – 0.7     → still write but flag
//   - "needs_review"  < 0.45         → DO NOT write, flag with reason
//   - "no_match"      0 comps        → don't touch value, mark no_match
//
// Sanity-bound the proposed value against the old value separately (see
// appraise/route.ts). A high-confidence score can still be overridden if
// the new value is wildly different from what the user last saw.

export interface AppraisalScore {
  confidence: number;
  status: "verified" | "needs_review" | "no_match";
  reason: string | null;
  shouldWriteValue: boolean;
}

export function scoreEbayAppraisal(summary: CompSummary): AppraisalScore {
  if (!summary.count || summary.count === 0) {
    return {
      confidence: 0,
      status: "no_match",
      reason: "no matching comps found",
      shouldWriteValue: false,
    };
  }

  const tier: AppraisalTier = summary.tier ?? "strict";
  const tierWeight = { strict: 1.0, "no-card-#": 0.7, "year+player only": 0.4 }[
    tier
  ];

  // Count score caps at 8 comps — beyond that, more comps don't add much trust
  const countScore = Math.min(summary.count / 8, 1);

  // Variance score — CV of 0 is perfect, CV of 1.5+ is junk
  const cv = summary.coefficient_of_variation ?? 0.8;
  const varianceScore = Math.max(0, 1 - cv / 1.5);

  // Sold bonus — if >50% of comps are actual sales, boost confidence 15%
  const soldCount = summary.sold_count ?? 0;
  const soldRatio = summary.count > 0 ? soldCount / summary.count : 0;
  const soldBonus = soldRatio > 0.5 ? 1.15 : 1.0;

  const raw = tierWeight * (0.55 * countScore + 0.45 * varianceScore) * soldBonus;
  const confidence = Math.min(1, Math.max(0, raw));

  const tierLabel =
    tier === "strict"
      ? "strict match"
      : tier === "no-card-#"
        ? "card # dropped"
        : "broad match";

  // Hard rule: fewer than 3 comps is never enough to auto-write. A single
  // listing can be cherry-picked / misfiled / a one-off bulk sale, and the
  // variance score can't tell us anything with n < 3. Always flag.
  const tooFewComps = summary.count < 3;

  if (!tooFewComps && confidence >= 0.7) {
    return {
      confidence,
      status: "verified",
      reason: null,
      shouldWriteValue: true,
    };
  }

  if (!tooFewComps && confidence >= 0.45) {
    return {
      confidence,
      status: "needs_review",
      reason: `medium confidence — ${summary.count} comp${summary.count === 1 ? "" : "s"}, ${tierLabel}`,
      shouldWriteValue: true,
    };
  }

  // Low confidence — don't write the value
  let reason: string;
  if (summary.count < 3) {
    reason = `only ${summary.count} comp${summary.count === 1 ? "" : "s"} found`;
  } else if (tier === "year+player only") {
    reason = "broad match — card # and set dropped";
  } else if (cv > 1.0) {
    reason = "high price variance — possible wrong match";
  } else {
    reason = `low confidence (${Math.round(confidence * 100)}%)`;
  }

  return {
    confidence,
    status: "needs_review",
    reason,
    shouldWriteValue: false,
  };
}

// Sanity check: even with high confidence, reject writes that change the
// value by more than 5x or less than 0.2x the previous value. Wild jumps
// are almost always a sign of a wrong match.
export function checkAppraisalSanity(
  oldValueCents: number | null | undefined,
  newValueCents: number
): { ok: boolean; reason: string | null } {
  if (!oldValueCents || oldValueCents <= 0 || newValueCents <= 0) {
    return { ok: true, reason: null };
  }
  const ratio = newValueCents / oldValueCents;
  if (ratio > 5) {
    return {
      ok: false,
      reason: `unusual jump: $${(oldValueCents / 100).toFixed(0)} → $${(newValueCents / 100).toFixed(0)} (${ratio.toFixed(1)}x)`,
    };
  }
  if (ratio < 0.2) {
    return {
      ok: false,
      reason: `unusual drop: $${(oldValueCents / 100).toFixed(0)} → $${(newValueCents / 100).toFixed(0)} (${ratio.toFixed(2)}x)`,
    };
  }
  return { ok: true, reason: null };
}

export async function fetchComps(card: CardInput): Promise<CompSummary> {
  if (isCardHedgeConfigured() && card.cardhedge_card_id) {
    const confirmed = await fetchCompsCardHedgeById(card).catch(() => null);
    if (confirmed) {
      return confirmed;
    }
  }

  const ebayP = isEbayConfigured()
    ? fetchCompsEbay(card).catch(() => null)
    : Promise.resolve(null);
  const cardhedgeP = isCardHedgeConfigured()
    ? fetchCompsCardHedge(card).catch(() => null)
    : Promise.resolve(null);

  const [ebayResult, cardhedgeResult] = await Promise.all([ebayP, cardhedgeP]);

  // eBay wins on pricing when it has real comp data
  if (ebayResult && ebayResult.count > 0) {
    return {
      ...ebayResult,
      // Still attach CardHedge match metadata if we have it (for UI display of
      // the authoritative card image, variant, card number, etc.)
      cardhedge_card_id: cardhedgeResult?.cardhedge_card_id,
      cardhedge_match: cardhedgeResult?.cardhedge_match,
      price_estimate: cardhedgeResult?.price_estimate,
    };
  }

  // Fallback: use CardHedge pricing when eBay has nothing
  if (cardhedgeResult && (cardhedgeResult.count > 0 || cardhedgeResult.cardhedge_card_id)) {
    return cardhedgeResult;
  }

  // Nothing worked
  return {
    comps: [],
    average_cents: 0,
    median_cents: 0,
    low_cents: 0,
    high_cents: 0,
    count: 0,
    query: buildCardQuery(card),
    source: isCardHedgeConfigured() ? "cardhedge" : "ebay",
  };
}
