const BASE_URL = "https://api.cardhedger.com/v1/cards";

function getApiKey(): string {
  const key = process.env.CARDHEDGE_API_KEY;
  if (!key) throw new Error("CARDHEDGE_API_KEY not configured");
  return key;
}

async function post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CardHedge ${endpoint} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---- Types ----

export interface CardMatch {
  confidence: number;
  reasoning: string;
  description: string;
  player: string;
  set: string;
  number: string;
  variant: string;
  card_id: string;
  image: string;
  category: string;
  prices: { grade: string; price: string }[];
}

export interface CardMatchResponse {
  match: CardMatch | null;
  candidates_evaluated: number;
  search_query_used: string;
}

export interface CompsResponse {
  comp_price: number;
  high: number;
  low: number;
  count_requested: number;
  count_used: number;
  time_weighted: boolean;
  raw_prices: number[] | null;
}

export interface PriceEstimate {
  price: number;
  price_low: number;
  price_high: number;
  confidence: number;
  method: string;
  freshness_days: number;
  support_grades: number;
  grade_label: string;
  provider: string;
  grade_value: number;
  error?: string | null;
}

export interface BatchPriceEstimateResponse {
  results: (PriceEstimate & { card_id: string; grade: string })[];
  total_requested: number;
  total_successful: number;
}

export interface CertPrice {
  closing_date: string;
  Grade: string;
  card_id: string;
  price: string;
}

export interface CertPricingResponse {
  cert_info: {
    grader: string;
    cert: string;
    grade: string;
    description: string;
  };
  card: {
    card_id: string;
    description: string;
    player: string;
    set: string;
    number: string;
    variant: string;
    image: string;
    category: string;
  };
  prices: CertPrice[];
}

// ---- API Functions ----

export async function matchCard(query: string): Promise<CardMatchResponse> {
  return post<CardMatchResponse>("/card-match", { query });
}

export async function getComps(
  cardId: string,
  grade: string,
  count = 10
): Promise<CompsResponse> {
  return post<CompsResponse>("/comps", {
    card_id: cardId,
    grade,
    count,
  });
}

export async function getPriceEstimate(
  cardId: string,
  grade: string
): Promise<PriceEstimate> {
  return post<PriceEstimate>("/price-estimate", {
    card_id: cardId,
    grade,
  });
}

export async function getBatchPriceEstimates(
  items: { card_id: string; grade: string }[]
): Promise<BatchPriceEstimateResponse> {
  return post<BatchPriceEstimateResponse>("/batch-price-estimate", {
    items,
  });
}

export async function getPricesByCert(cert: string): Promise<CertPricingResponse> {
  return post<CertPricingResponse>("/prices-by-cert", { cert });
}

export async function getAllPricesByCard(
  cardId: string
): Promise<{ prices: { grade: string; price: string }[] }> {
  return post<{ prices: { grade: string; price: string }[] }>(
    "/all-prices-by-card",
    { card_id: cardId }
  );
}

export interface ImageSearchResult {
  card_id: string;
  description: string;
  player: string;
  set: string;
  number: string;
  variant: string;
  image: string;
  similarity: number;
}

export interface ImageSearchResponse {
  results: ImageSearchResult[];
}

export async function imageSearch(
  imageBase64: string
): Promise<ImageSearchResponse> {
  return post<ImageSearchResponse>("/image-search", {
    image_base64: imageBase64,
  });
}
