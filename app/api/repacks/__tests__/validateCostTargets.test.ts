import { describe, it, expect } from "vitest";
import { validateCostTargets } from "@/app/api/repacks/route";

describe("validateCostTargets", () => {
  it("passes when all are null", () => {
    expect(validateCostTargets(null, null, null)).toBeNull();
  });

  it("passes with a single value set", () => {
    expect(validateCostTargets(100, null, null)).toBeNull();
    expect(validateCostTargets(null, 100, null)).toBeNull();
    expect(validateCostTargets(null, null, 100)).toBeNull();
  });

  it("passes when floor ≤ target ≤ ceiling", () => {
    expect(validateCostTargets(50, 100, 150)).toBeNull();
  });

  it("passes when floor == target == ceiling (all equal)", () => {
    expect(validateCostTargets(100, 100, 100)).toBeNull();
  });

  it("rejects when floor > target", () => {
    const err = validateCostTargets(200, 100, null);
    expect(err).toContain("Floor");
    expect(err).toContain("target");
  });

  it("rejects when target > ceiling", () => {
    const err = validateCostTargets(null, 200, 100);
    expect(err).toContain("Target");
    expect(err).toContain("ceiling");
  });

  it("rejects when floor > ceiling (even without target)", () => {
    const err = validateCostTargets(200, null, 100);
    expect(err).toContain("Floor");
    expect(err).toContain("ceiling");
  });

  it("returns the FIRST error when multiple are invalid", () => {
    const err = validateCostTargets(300, 200, 100); // floor > target AND target > ceiling
    expect(err).toContain("Floor");
    expect(err).toContain("target");
  });
});
