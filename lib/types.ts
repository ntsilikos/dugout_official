// ---- AI Grading Types (existing) ----

export interface SubGrade {
  category: "centering" | "corners" | "edges" | "surface";
  score: number;
  notes: string;
}

export interface GradeResult {
  overallGrade: number;
  overallLabel: string;
  subGrades: SubGrade[];
  cardIdentification: string;
  explanation: string;
}

export interface GradeRequest {
  image: string;
  mediaType: string;
}

export interface GradeResponse {
  success: boolean;
  result?: GradeResult;
  error?: string;
}

// ---- AI Scan Types ----

export interface ScanResult extends GradeResult {
  playerName: string | null;
  year: number | null;
  brand: string | null;
  setName: string | null;
  cardNumber: string | null;
  variant: string | null;
  sport: string | null;
  estimatedValueCents: number | null;
}

export interface ScanResponse {
  success: boolean;
  result?: ScanResult;
  error?: string;
}

// ---- Database Entity Types ----

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  player_name: string | null;
  year: number | null;
  brand: string | null;
  set_name: string | null;
  card_number: string | null;
  variant: string | null;
  sport: string | null;
  condition: "raw" | "graded";
  grade_company: string | null;
  grade_value: number | null;
  grade_label: string | null;
  estimated_value_cents: number | null;
  purchase_price_cents: number | null;
  notes: string | null;
  tags: string[];
  ai_identification: Record<string, unknown> | null;
  status: "in_collection" | "listed" | "sold";
  created_at: string;
  updated_at: string;
  // Joined
  images?: CardImage[];
  grades?: CardGrade[];
}

export interface CardImage {
  id: string;
  card_id: string;
  user_id: string;
  storage_path: string;
  display_order: number;
  is_primary: boolean;
  side: "front" | "back";
  created_at: string;
  // Computed
  url?: string;
}

export interface CardGrade {
  id: string;
  card_id: string;
  user_id: string;
  overall_grade: number;
  overall_label: string;
  centering_score: number | null;
  centering_notes: string | null;
  corners_score: number | null;
  corners_notes: string | null;
  edges_score: number | null;
  edges_notes: string | null;
  surface_score: number | null;
  surface_notes: string | null;
  card_identification: string | null;
  explanation: string | null;
  raw_response: Record<string, unknown> | null;
  created_at: string;
}

// ---- Dashboard Types ----

export interface DashboardStats {
  totalCards: number;
  totalValueCents: number;
  totalCostCents: number;
  cardsListed: number;
  cardsSold: number;
  sportBreakdown: { sport: string; count: number; valueCents: number }[];
  recentCards: Card[];
}

// ---- API Types ----

export interface CardListParams {
  q?: string;
  sport?: string;
  status?: string;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CardListResponse {
  cards: Card[];
  total: number;
  page: number;
  limit: number;
}
