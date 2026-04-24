import { describe, it, expect } from "vitest";
import { listingTitleMatches } from "@/lib/pricing";

const GRADED_CARD = {
  player_name: "LeBron James",
  year: 2003,
  brand: "Topps",
  set_name: "Topps Chrome",
  card_number: "111",
  variant: null,
  grade_company: "PSA",
  grade_value: 10,
};

const RAW_CARD = {
  player_name: "LeBron James",
  year: 2003,
  brand: "Topps",
  set_name: "Topps Chrome",
  card_number: "111",
  variant: null,
  grade_company: null,
  grade_value: null,
};

describe("listingTitleMatches — grade filter", () => {
  it("graded card ACCEPTS listing with matching grade", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 PSA 10 Rookie",
      GRADED_CARD
    );
    expect(r.matches).toBe(true);
    expect(r.matchedChecks.some((c) => c.includes("PSA 10"))).toBe(true);
  });

  it("graded card REJECTS ungraded listing", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 Rookie",
      GRADED_CARD
    );
    expect(r.matches).toBe(false);
    expect(r.reason).toContain("ungraded");
  });

  it("graded card REJECTS different grade", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 PSA 9 Rookie",
      GRADED_CARD
    );
    expect(r.matches).toBe(false);
    expect(r.reason).toContain("grade mismatch");
  });

  it("graded card REJECTS different grader", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 BGS 10 Rookie",
      GRADED_CARD
    );
    expect(r.matches).toBe(false);
    expect(r.reason).toContain("grade mismatch");
  });

  it("graded card accepts compressed grade format (PSA10)", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 PSA10 Rookie",
      GRADED_CARD
    );
    expect(r.matches).toBe(true);
  });

  it("graded card accepts BGS half-grade (BGS 9.5)", () => {
    const card = { ...GRADED_CARD, grade_company: "BGS", grade_value: 9.5 };
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 BGS 9.5",
      card
    );
    expect(r.matches).toBe(true);
  });

  it("raw card ACCEPTS ungraded listing", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 Rookie",
      RAW_CARD
    );
    expect(r.matches).toBe(true);
  });

  it("raw card REJECTS listing with PSA grade", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 PSA 10",
      RAW_CARD
    );
    expect(r.matches).toBe(false);
    expect(r.reason).toContain("graded listing");
  });

  it("raw card REJECTS listing with BGS grade", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 BGS 9.5",
      RAW_CARD
    );
    expect(r.matches).toBe(false);
  });

  it('non-standard condition words like "MINT" do not trigger grade filter', () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #111 MINT Rookie",
      RAW_CARD
    );
    expect(r.matches).toBe(true);
  });
});

describe("listingTitleMatches — other checks still work", () => {
  it("rejects wrong year", () => {
    const r = listingTitleMatches(
      "2004 Topps Chrome LeBron James #111 Rookie",
      RAW_CARD
    );
    expect(r.matches).toBe(false);
    expect(r.reason).toContain("year");
  });

  it("accepts YYYY-YY season format", () => {
    const r = listingTitleMatches(
      "2003-04 Topps Chrome LeBron James #111 Rookie",
      RAW_CARD
    );
    expect(r.matches).toBe(true);
  });

  it('does not treat "Card 15 of 23" year-like numbers as a year match', () => {
    const r = listingTitleMatches(
      "2004 Topps Chrome LeBron James #111 Card 15 of 2003",
      RAW_CARD
    );
    // The "2003" embedded in "of 2003" is stripped before year check
    expect(r.matches).toBe(false);
  });

  it("rejects wrong card number", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James #222 Rookie",
      RAW_CARD
    );
    expect(r.matches).toBe(false);
    expect(r.reason).toContain("card #");
  });

  it("accepts alternate card number markers (card, no.)", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron James Card 111 Rookie",
      RAW_CARD
    );
    expect(r.matches).toBe(true);
  });

  it("requires last name to be present", () => {
    const r = listingTitleMatches(
      "2003 Topps Chrome LeBron #111 Rookie",
      RAW_CARD
    );
    // Last name "james" is missing
    expect(r.matches).toBe(false);
    expect(r.reason).toContain("player");
  });

  it("is lenient on set abbreviation — needs at least one distinctive token", () => {
    const r = listingTitleMatches(
      "2003 Chrome LeBron James #111",
      RAW_CARD
    );
    // Has "chrome" token from "Topps Chrome"
    expect(r.matches).toBe(true);
  });
});
