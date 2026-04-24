import { describe, it, expect } from "vitest";
import {
  buildHunterQuery,
  filterListingsByCardNumbers,
  summarizeHunterFilters,
} from "./hunter-query";

describe("buildHunterQuery", () => {
  it("returns 'sports card' when no filters provided", () => {
    const q = buildHunterQuery({}, null);
    expect(q.keyword).toBe("sports card");
  });

  it("includes athlete + manufacturer + set in the keyword", () => {
    const q = buildHunterQuery(
      { athlete: "LeBron James", manufacturer: "Topps", set_name: "Chrome" },
      null
    );
    expect(q.keyword).toContain("LeBron James");
    expect(q.keyword).toContain("Topps");
    expect(q.keyword).toContain("Chrome");
  });

  it("converts year_min/year_max into the keyword", () => {
    const q = buildHunterQuery({ year_min: 2003, year_max: 2003, athlete: "LeBron" }, null);
    expect(q.keyword).toContain("2003");
    // Single year, only included once
    expect(q.keyword.match(/2003/g)).toHaveLength(1);
  });

  it("includes both years when range is non-zero", () => {
    const q = buildHunterQuery({ year_min: 2003, year_max: 2005 }, null);
    expect(q.keyword).toContain("2003");
    expect(q.keyword).toContain("2005");
  });

  it("encodes card number with # prefix", () => {
    const q = buildHunterQuery({ card_number: "LJ32" }, null);
    expect(q.keyword).toContain("#LJ32");
  });

  it("preserves existing # prefix without doubling it", () => {
    const q = buildHunterQuery({ card_number: "#23" }, null);
    expect(q.keyword).toContain("#23");
    expect(q.keyword).not.toContain("##23");
  });

  it("adds 'autograph' to the keyword when autographed=true", () => {
    const q = buildHunterQuery({ athlete: "Brady", autographed: true }, null);
    expect(q.keyword.toLowerCase()).toContain("autograph");
  });

  it("does NOT add autograph when autographed=false or missing", () => {
    const off = buildHunterQuery({ athlete: "Brady", autographed: false }, null);
    expect(off.keyword.toLowerCase()).not.toContain("autograph");
    const missing = buildHunterQuery({ athlete: "Brady" }, null);
    expect(missing.keyword.toLowerCase()).not.toContain("autograph");
  });

  it("encodes a single grader+grade", () => {
    const q = buildHunterQuery(
      { athlete: "Mahomes", grader: "PSA", grade_min: 10, grade_max: 10 },
      null
    );
    expect(q.keyword).toContain("PSA 10");
  });

  it("encodes a grade RANGE", () => {
    const q = buildHunterQuery(
      { grader: "PSA", grade_min: 9, grade_max: 10 },
      null
    );
    expect(q.keyword).toContain("PSA 9-10");
  });

  it("encodes a min-only grade as PSA 9+", () => {
    const q = buildHunterQuery({ grader: "PSA", grade_min: 9 }, null);
    expect(q.keyword).toContain("PSA 9+");
  });

  it("ignores grader='Any'", () => {
    const q = buildHunterQuery({ grader: "Any", grade_min: 9 }, null);
    expect(q.keyword.toLowerCase()).not.toContain("any");
    expect(q.grader).toBeUndefined();
  });

  it("passes maxPrice through when provided", () => {
    const q = buildHunterQuery({ athlete: "x" }, 5000);
    expect(q.maxPrice).toBe(5000);
  });

  it("returns sport in structured output", () => {
    const q = buildHunterQuery({ sport: "Basketball", athlete: "LeBron" }, null);
    expect(q.sport).toBe("Basketball");
    expect(q.keyword).toContain("Basketball");
  });

  it("includes parallel in keyword (was being silently dropped before fix)", () => {
    const q = buildHunterQuery({ athlete: "Mahomes", parallel: "Silver Prizm" }, null);
    expect(q.keyword).toContain("Silver Prizm");
  });

  it("dedupes overlapping tokens (set_name + brand + sport word repetition)", () => {
    const q = buildHunterQuery(
      {
        sport: "Basketball",
        manufacturer: "Topps Chrome Basketball",
        set_name: "2025 Topps Chrome Basketball",
        year_min: 2025,
        year_max: 2025,
      },
      null
    );
    // "Basketball" should appear ONCE not 3x; "Topps" / "Chrome" once each
    const tokens = q.keyword.split(/\s+/);
    expect(tokens.filter((t) => t.toLowerCase() === "basketball")).toHaveLength(1);
    expect(tokens.filter((t) => t.toLowerCase() === "topps")).toHaveLength(1);
    expect(tokens.filter((t) => t.toLowerCase() === "chrome")).toHaveLength(1);
  });

  it("FULL combo — every filter populated, all show up", () => {
    const q = buildHunterQuery(
      {
        athlete: "Patrick Mahomes",
        sport: "Football",
        year_min: 2017,
        year_max: 2017,
        manufacturer: "Panini",
        set_name: "Prizm",
        parallel: "Silver",
        card_number: "262",
        grader: "PSA",
        grade_min: 10,
        grade_max: 10,
        autographed: false,
      },
      99999
    );
    const k = q.keyword;
    expect(k).toContain("Patrick Mahomes");
    expect(k).toContain("Football");
    expect(k).toContain("2017");
    expect(k).toContain("Panini");
    expect(k).toContain("Prizm");
    expect(k).toContain("Silver");
    expect(k).toContain("#262");
    expect(k).toContain("PSA 10");
    expect(q.maxPrice).toBe(99999);
    expect(q.sport).toBe("Football");
    expect(q.grader).toBe("PSA");
  });
});

describe("filterListingsByCardNumbers", () => {
  const listings = [
    { title: "2024 Topps Series 1 #23 LeBron James" },
    { title: "2024 Topps Series 1 #50 Mahomes" },
    { title: "2024 Topps Series 1 Card 99 Ohtani" },
    { title: "2024 Topps Series 1 NO. 17 Brady" },
    { title: "Bulk lot 100 cards from 23 different teams" }, // misleading "23"
    { title: "2024 Topps Series 1 #BDC-15 Wemby" }, // letter prefix
  ];

  it("returns all listings when no targets provided", () => {
    expect(filterListingsByCardNumbers(listings, null)).toHaveLength(listings.length);
    expect(filterListingsByCardNumbers(listings, [])).toHaveLength(listings.length);
  });

  it("matches '#23' format", () => {
    const out = filterListingsByCardNumbers(listings, ["23"]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toContain("#23 LeBron");
  });

  it("matches 'Card N' format", () => {
    const out = filterListingsByCardNumbers(listings, ["99"]);
    expect(out.some((l) => l.title.includes("99 Ohtani"))).toBe(true);
  });

  it("matches 'NO. N' format", () => {
    const out = filterListingsByCardNumbers(listings, ["17"]);
    expect(out.some((l) => l.title.includes("17 Brady"))).toBe(true);
  });

  it("does NOT match bare numbers in unrelated context (e.g., 'lot 100 cards from 23 teams')", () => {
    const out = filterListingsByCardNumbers(listings, ["23"]);
    expect(out.some((l) => l.title.includes("Bulk lot"))).toBe(false);
  });

  it("matches letter-prefixed numbers like BDC-15", () => {
    const out = filterListingsByCardNumbers(listings, ["BDC-15"]);
    expect(out).toHaveLength(1);
    expect(out[0].title).toContain("BDC-15");
  });

  it("matches multiple targets in one filter call", () => {
    const out = filterListingsByCardNumbers(listings, ["23", "50", "99"]);
    expect(out).toHaveLength(3);
  });

  it("strips leading # from input targets", () => {
    const out = filterListingsByCardNumbers(listings, ["#23"]);
    expect(out).toHaveLength(1);
  });

  it("escapes regex special characters safely", () => {
    // Should not crash or match weird stuff if user passes in regex chars
    const out = filterListingsByCardNumbers(listings, ["23.*"]);
    expect(out).toEqual([]);
  });
});

describe("summarizeHunterFilters", () => {
  it("returns 'any card' when nothing is set", () => {
    expect(summarizeHunterFilters({})).toBe("any card");
  });

  it("joins fields with the · separator", () => {
    const summary = summarizeHunterFilters({
      athlete: "LeBron",
      year_min: 2003,
      year_max: 2003,
      grader: "PSA",
      grade_min: 9,
      grade_max: 9,
    });
    expect(summary).toContain("LeBron");
    expect(summary).toContain("PSA 9");
    expect(summary.split(" · ").length).toBeGreaterThan(1);
  });

  it("shows year range when min and max differ", () => {
    expect(summarizeHunterFilters({ year_min: 2003, year_max: 2005 })).toContain(
      "2003-2005"
    );
  });

  it("includes Auto badge when autographed", () => {
    expect(summarizeHunterFilters({ athlete: "Brady", autographed: true })).toContain(
      "Auto"
    );
  });
});
