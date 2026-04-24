// Shared helper used by both /api/hunters/[id]/run and /api/hunters/cron
// to build a marketplace search query from saved hunter filters.
// All filter fields are accounted for here so neither endpoint silently drops them.

import type { MarketplaceSearchQuery } from "./marketplaces/types";

type HunterFilters = Record<string, string | number | boolean | undefined>;

export function buildHunterQuery(
  filters: HunterFilters,
  maxPriceCents: number | null | undefined
): MarketplaceSearchQuery {
  const parts: string[] = [];

  // Year — accept either a single `year` or `year_min` / `year_max` range
  if (filters.year_min && filters.year_max && filters.year_min === filters.year_max) {
    parts.push(String(filters.year_min));
  } else if (filters.year_min || filters.year_max) {
    if (filters.year_min) parts.push(String(filters.year_min));
    if (filters.year_max && filters.year_max !== filters.year_min) {
      parts.push(String(filters.year_max));
    }
  } else if (filters.year) {
    parts.push(String(filters.year));
  }

  if (filters.manufacturer) parts.push(String(filters.manufacturer));
  if (filters.set_name) parts.push(String(filters.set_name));
  if (filters.parallel) parts.push(String(filters.parallel));
  if (filters.athlete) parts.push(String(filters.athlete));
  if (filters.sport) parts.push(String(filters.sport));
  if (filters.card_number) parts.push(`#${String(filters.card_number).replace(/^#/, "")}`);

  // Autographed signal — eBay listings typically include "auto", "autograph", or "AU"
  if (filters.autographed === true) parts.push("autograph");

  // Grade signal — encode into keyword since eBay Browse API has no grade filter
  // e.g. "PSA 9", "PSA 9-10", "BGS 9.5"
  const grader = filters.grader && filters.grader !== "Any" ? String(filters.grader) : null;
  if (grader) {
    if (filters.grade_min && filters.grade_max && filters.grade_min === filters.grade_max) {
      parts.push(`${grader} ${filters.grade_min}`);
    } else if (filters.grade_min || filters.grade_max) {
      if (filters.grade_min && filters.grade_max) {
        parts.push(`${grader} ${filters.grade_min}-${filters.grade_max}`);
      } else if (filters.grade_min) {
        parts.push(`${grader} ${filters.grade_min}+`);
      } else {
        parts.push(grader);
      }
    } else {
      parts.push(grader);
    }
  }

  // Dedupe tokens — when set_name, brand, and sport overlap (e.g. set_name
  // "2025 Topps Chrome Basketball" + brand "Topps Chrome Basketball" + sport
  // "Basketball" → all three), the keyword would repeat the same words 3x.
  const rawKeyword = parts.filter(Boolean).join(" ");
  const seen = new Set<string>();
  const dedupedTokens: string[] = [];
  for (const tok of rawKeyword.split(/\s+/)) {
    const lower = tok.toLowerCase();
    if (lower && !seen.has(lower)) {
      seen.add(lower);
      dedupedTokens.push(tok);
    }
  }
  const keyword = dedupedTokens.join(" ") || "sports card";

  return {
    keyword,
    sport: filters.sport ? String(filters.sport) : undefined,
    maxPrice: maxPriceCents || undefined,
    grader: grader || undefined,
    minGrade: filters.grade_min ? Number(filters.grade_min) : undefined,
    maxGrade: filters.grade_max ? Number(filters.grade_max) : undefined,
  };
}

// Filter marketplace listing results to only those whose titles include one
// of the target card numbers. Used by hunters that target specific card #s
// (e.g., "Missing from 2024 Topps Series 1" — narrowed to the 80 missing).
//
// Match formats: "#23", "no. 23", "card 23", " 23 ", " 23-" — but NOT
// "23 of 100" (subset count, not a card number).
export function filterListingsByCardNumbers<
  T extends { title: string }
>(listings: T[], targetCardNumbers: string[] | null | undefined): T[] {
  if (!targetCardNumbers || targetCardNumbers.length === 0) return listings;

  // Normalize targets, escape regex chars
  const normalized = targetCardNumbers
    .map((n) => String(n).replace(/^#/, "").trim())
    .filter(Boolean)
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (normalized.length === 0) return listings;

  // Build a single regex matching any target number in card-number contexts
  const pattern = new RegExp(
    `(?:#\\s*|\\bno\\.?\\s+|\\bcard\\s*#?\\s*)(${normalized.join("|")})\\b(?!\\s*of\\b)`,
    "i"
  );

  return listings.filter((l) => pattern.test(l.title));
}

// Build a human-readable summary of which filters are active — used in error
// messages and notifications for context.
export function summarizeHunterFilters(filters: HunterFilters): string {
  const summary: string[] = [];
  if (filters.athlete) summary.push(String(filters.athlete));
  if (filters.year_min && filters.year_max) {
    summary.push(`${filters.year_min}-${filters.year_max}`);
  } else if (filters.year_min) {
    summary.push(String(filters.year_min));
  } else if (filters.year) {
    summary.push(String(filters.year));
  }
  if (filters.manufacturer) summary.push(String(filters.manufacturer));
  if (filters.set_name) summary.push(String(filters.set_name));
  if (filters.parallel) summary.push(String(filters.parallel));
  if (filters.card_number) summary.push(`#${filters.card_number}`);
  if (filters.grader && filters.grader !== "Any") {
    const grade = filters.grade_min && filters.grade_max
      ? `${filters.grade_min}-${filters.grade_max}`
      : filters.grade_min || filters.grade_max || "";
    summary.push(`${filters.grader}${grade ? ` ${grade}` : ""}`);
  }
  if (filters.autographed) summary.push("Auto");
  return summary.join(" · ") || "any card";
}
