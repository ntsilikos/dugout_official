import eBayApi from "ebay-api";
import { matchCard, getComps, getPriceEstimate, type CardMatch, type PriceEstimate } from "./cardhedge";
import { isCardHedgeConfigured, isEbayConfigured } from "./config";

// Grading companies that CardHedge recognizes
const KNOWN_GRADERS = new Set(["PSA", "BGS", "SGC", "CGC", "CSG", "HGA"]);

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
}

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
}

type CardInput = {
  player_name?: string | null;
  year?: number | null;
  brand?: string | null;
  set_name?: string | null;
  card_number?: string | null;
  variant?: string | null;
  grade_company?: string | null;
  grade_value?: number | null;
  condition?: string | null;
};

export function buildCardQuery(card: CardInput): string {
  // If set_name already contains the brand, skip brand to avoid "Topps Topps Series 1"
  const brandStr = card.brand || "";
  const setStr = card.set_name || "";
  const skipBrand = setStr.toLowerCase().includes(brandStr.toLowerCase()) && brandStr.length > 0;

  const parts: (string | number | null | false | undefined)[] = [
    card.year,
    skipBrand ? null : brandStr,
    setStr,
    card.player_name,
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

// Build progressively simpler query variations to try in order.
// Multi-player cards, obscure sets, or specific numbering often fail
// on the detailed query but succeed with a simpler one.
function buildQueryVariations(card: CardInput): string[] {
  const variations: string[] = [];
  const brandStr = card.brand || "";
  const setStr = card.set_name || "";
  const skipBrand =
    setStr.toLowerCase().includes(brandStr.toLowerCase()) && brandStr.length > 0;

  // Extract first player from multi-player cards (e.g., "Durant, Roy, Okafor, James" → "Durant")
  const firstPlayer = card.player_name?.split(",")[0]?.trim() || "";

  // Variation 1: Full detailed query
  const full = [
    card.year,
    skipBrand ? null : brandStr,
    setStr,
    card.player_name,
    card.card_number && `#${card.card_number}`,
  ]
    .filter(Boolean)
    .join(" ");
  if (full.trim()) variations.push(full);

  // Variation 2: Year + set + all players (no card number)
  if (card.year && setStr && card.player_name) {
    variations.push(`${card.year} ${setStr} ${card.player_name}`);
  }

  // Variation 3: Year + set + first player only (for multi-player cards)
  if (card.year && setStr && firstPlayer && firstPlayer !== card.player_name) {
    variations.push(`${card.year} ${setStr} ${firstPlayer}`);
  }

  // Variation 4: Year + first player only (broadest)
  if (card.year && firstPlayer) {
    variations.push(`${card.year} ${firstPlayer}`);
  }

  // De-dup and return
  return Array.from(new Set(variations)).filter((q) => q.trim().length > 0);
}

// Strict title filter — reject eBay listings whose titles clearly describe
// a different card (wrong year, wrong card number, wrong set, etc).
// Be aggressive: false rejections are better than false matches, since a
// false match creates a misleading price while a false rejection is visible.
function listingTitleMatches(
  title: string,
  card: CardInput
): { matches: boolean; reason?: string } {
  const t = title.toLowerCase();

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
    const tForYear = t.replace(/\b\d+\s*of\s*\d+\b/g, " ");

    const hasYear =
      tForYear.includes(year) ||
      tForYear.includes(seasonPrev) ||
      tForYear.includes(seasonCurr);
    if (!hasYear) return { matches: false, reason: `missing year ${year}` };
  }

  // ---- Card number check ----
  // MUST have an explicit # prefix or "no./card" marker. Bare numbers like
  // "Card 15 of 23" should NOT count as matching card #23.
  if (card.card_number) {
    const num = card.card_number.replace(/^#/, "").trim();
    if (num) {
      const numPattern = new RegExp(
        `(?:#\\s*|\\bno\\.?\\s+|\\bcard\\s*#?\\s*)${num}\\b(?!\\s*of\\b)`,
        "i"
      );
      if (!numPattern.test(title)) {
        return { matches: false, reason: `missing card #${num}` };
      }
    }
  }

  // ---- Set name check ----
  // At least 2 of the distinctive set words must appear. This catches cases
  // where "Rookie of the Year" scan leaks "Rookie of the Month" results.
  if (card.set_name) {
    const stopWords = new Set([
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
    ]);
    const setWords = card.set_name
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    if (setWords.length > 0) {
      // Require full contiguous phrase match if set is distinctive (e.g., "rookie of the year")
      const fullPhrase = card.set_name.toLowerCase();
      if (fullPhrase.length >= 8 && !t.includes(fullPhrase)) {
        // Full phrase missing — check that all distinctive words are present
        const missing = setWords.filter((w) => !t.includes(w));
        if (missing.length > 0) {
          return {
            matches: false,
            reason: `missing set words: ${missing.join(", ")}`,
          };
        }
      }
    }
  }

  // ---- Player last name check ----
  if (card.player_name) {
    const firstPlayer = card.player_name.split(",")[0].trim();
    const lastName = firstPlayer.split(/\s+/).pop()?.toLowerCase();
    if (lastName && lastName.length > 2 && !t.includes(lastName)) {
      return { matches: false, reason: `missing player ${lastName}` };
    }
  }

  return { matches: true };
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

    // Try each query variation until one returns results.
    // NO category filter — eBay's text search is good enough and many cards
    // end up in non-standard categories. Sports Trading Card Singles is too narrow.
    let items: Array<{
      title?: string;
      price?: { value?: string };
      itemEndDate?: string;
      condition?: string;
      image?: { imageUrl?: string };
      itemWebUrl?: string;
    }> = [];
    let usedQuery = primaryQuery;

    for (const query of variations) {
      try {
        const response = await client.buy.browse.search({
          q: query,
          limit: "30",
        });
        const found = response.itemSummaries || [];
        if (found.length > 0) {
          items = found;
          usedQuery = query;
          console.log(
            `[ebay] Found ${found.length} listings for "${query}" (var ${variations.indexOf(query) + 1}/${variations.length})`
          );
          break;
        }
      } catch (err) {
        console.log(
          `[ebay] Query "${query}" errored: ${err instanceof Error ? err.message : "unknown"}`
        );
      }
    }

    if (!items.length) {
      console.log(`[ebay] No results found for any variation of "${primaryQuery}"`);
      return { ...empty, query: usedQuery };
    }

    const allComps: CompResult[] = items.map((item) => ({
      title: item.title || "",
      price_cents: Math.round(parseFloat(item.price?.value || "0") * 100),
      sold_date: item.itemEndDate || new Date().toISOString(),
      condition: item.condition || "Unknown",
      image_url: item.image?.imageUrl || null,
      listing_url: item.itemWebUrl || "",
    }));

    // Strict title filter — drop listings whose titles clearly describe a
    // different card (wrong year, wrong number, wrong player)
    const filtered: CompResult[] = [];
    let rejected = 0;
    for (const comp of allComps) {
      const check = listingTitleMatches(comp.title, card);
      if (check.matches) {
        filtered.push(comp);
      } else {
        rejected++;
      }
    }
    if (rejected > 0) {
      console.log(
        `[ebay] Rejected ${rejected}/${allComps.length} listings with mismatched titles`
      );
    }

    // If the strict filter killed everything, fall back to all results
    // rather than returning nothing (user can still manually review)
    const comps = filtered.length > 0 ? filtered : allComps;

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
    };
  } catch {
    return empty;
  }
}

// ---- CardHedge primary ----

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

  let compPrice = 0;
  let high = 0;
  let low = 0;
  let compCount = 0;
  try {
    const compsData = await getComps(match.card_id, grade, 10);
    compPrice = compsData.comp_price;
    high = compsData.high;
    low = compsData.low;
    compCount = compsData.count_used;
  } catch {
    // Comps may not be available
  }

  let estimate: PriceEstimate | undefined;
  try {
    estimate = await getPriceEstimate(match.card_id, grade);
  } catch {
    // Estimate may not be available
  }

  const comps: CompResult[] = (match.prices || []).map((p) => ({
    title: `${match.description} ${p.grade}`,
    price_cents: Math.round(parseFloat(p.price) * 100),
    sold_date: new Date().toISOString(),
    condition: p.grade,
    image_url: match.image ? `https:${match.image}` : null,
    listing_url: "",
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
    query: matchResult.search_query_used,
    source: "cardhedge",
    cardhedge_card_id: match.card_id,
    cardhedge_match: match,
    price_estimate: estimate,
  };
}

// ---- Main entry: eBay first for PRICES, CardHedge for metadata/match ----
//
// Strategy: eBay has real-time market data from actual listings, so it wins
// on pricing. CardHedge is still useful for identity verification (its
// image-search + AI matching) but its prices are curated/stale.
//
// We run both in parallel when possible and merge: eBay prices + CardHedge match.
export async function fetchComps(card: CardInput): Promise<CompSummary> {
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
  };
}
