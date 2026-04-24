import { describe, it, expect } from "vitest";
import {
  scoreEbayAppraisal,
  checkAppraisalSanity,
  type CompSummary,
} from "@/lib/pricing";

function summary(overrides: Partial<CompSummary> = {}): CompSummary {
  return {
    comps: [],
    average_cents: 10000,
    median_cents: 10000,
    low_cents: 9000,
    high_cents: 11000,
    count: 8,
    query: "test",
    source: "ebay",
    tier: "strict",
    coefficient_of_variation: 0.1,
    sold_count: 0,
    active_count: 8,
    ...overrides,
  };
}

describe("scoreEbayAppraisal", () => {
  it("returns no_match when count is 0", () => {
    const score = scoreEbayAppraisal(summary({ count: 0 }));
    expect(score.status).toBe("no_match");
    expect(score.shouldWriteValue).toBe(false);
    expect(score.reason).toContain("no matching comps");
  });

  it("verifies high count + strict tier + tight cluster", () => {
    const score = scoreEbayAppraisal(
      summary({
        count: 10,
        tier: "strict",
        coefficient_of_variation: 0.1,
      })
    );
    expect(score.status).toBe("verified");
    expect(score.shouldWriteValue).toBe(true);
    expect(score.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("flags low-count but strict-tier results for review", () => {
    const score = scoreEbayAppraisal(
      summary({
        count: 2,
        tier: "strict",
        coefficient_of_variation: 0.1,
      })
    );
    expect(score.status).toBe("needs_review");
    expect(score.shouldWriteValue).toBe(false);
    expect(score.reason).toContain("2 comps");
  });

  it("flags broad-match (year+player only) results regardless of count", () => {
    const score = scoreEbayAppraisal(
      summary({
        count: 20,
        tier: "year+player only",
        coefficient_of_variation: 0.1,
      })
    );
    // Tier weight of 0.4 caps confidence at ~0.4 — never verified
    expect(score.status).toBe("needs_review");
    expect(score.confidence).toBeLessThan(0.7);
  });

  it("flags high variance even with many comps", () => {
    const score = scoreEbayAppraisal(
      summary({
        count: 15,
        tier: "strict",
        coefficient_of_variation: 1.3, // wild price spread
      })
    );
    expect(score.status).not.toBe("verified");
    expect(score.confidence).toBeLessThan(0.7);
  });

  it("boosts confidence when sold ratio exceeds 50%", () => {
    const withoutSold = scoreEbayAppraisal(
      summary({ count: 6, sold_count: 0 })
    );
    const withSold = scoreEbayAppraisal(summary({ count: 6, sold_count: 5 }));
    expect(withSold.confidence).toBeGreaterThan(withoutSold.confidence);
  });

  it("handles no_card_# tier as medium confidence given enough comps", () => {
    const score = scoreEbayAppraisal(
      summary({
        count: 10,
        tier: "no-card-#",
        coefficient_of_variation: 0.15,
      })
    );
    // Should write but be flagged for review
    expect(score.status).toBe("needs_review");
    expect(score.shouldWriteValue).toBe(true);
  });

  it("single comp is always low confidence", () => {
    const score = scoreEbayAppraisal(
      summary({ count: 1, tier: "strict", coefficient_of_variation: 0 })
    );
    expect(score.status).toBe("needs_review");
    expect(score.shouldWriteValue).toBe(false);
    expect(score.reason).toContain("1 comp");
  });
});

describe("checkAppraisalSanity", () => {
  it("passes when old value is null", () => {
    const r = checkAppraisalSanity(null, 50000);
    expect(r.ok).toBe(true);
  });

  it("passes when old value is zero", () => {
    const r = checkAppraisalSanity(0, 50000);
    expect(r.ok).toBe(true);
  });

  it("passes when new value is within normal range", () => {
    const r = checkAppraisalSanity(10000, 12000);
    expect(r.ok).toBe(true);
  });

  it("rejects a 10x jump", () => {
    const r = checkAppraisalSanity(5000, 50000);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("jump");
  });

  it("rejects a drop to 10% of old value", () => {
    const r = checkAppraisalSanity(100000, 5000);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("drop");
  });

  it("passes at exactly 5x (boundary)", () => {
    const r = checkAppraisalSanity(1000, 5000);
    expect(r.ok).toBe(true);
  });

  it("passes at exactly 0.2x (boundary)", () => {
    const r = checkAppraisalSanity(10000, 2000);
    expect(r.ok).toBe(true);
  });
});
