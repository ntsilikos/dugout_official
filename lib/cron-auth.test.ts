import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAuthorizedCron } from "./cron-auth";
import { NextRequest } from "next/server";

const SECRET = "test-secret-12345";

function makeRequest(headers: Record<string, string>): NextRequest {
  return new NextRequest("http://localhost/api/test", {
    headers: new Headers(headers),
  });
}

describe("isAuthorizedCron", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("returns false when CRON_SECRET env var is not set", () => {
    delete process.env.CRON_SECRET;
    const req = makeRequest({ authorization: `Bearer ${SECRET}` });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("accepts the Vercel Cron 'Authorization: Bearer <secret>' header", () => {
    const req = makeRequest({ authorization: `Bearer ${SECRET}` });
    expect(isAuthorizedCron(req)).toBe(true);
  });

  it("accepts the legacy 'x-cron-secret' header for external schedulers", () => {
    const req = makeRequest({ "x-cron-secret": SECRET });
    expect(isAuthorizedCron(req)).toBe(true);
  });

  it("rejects when no auth header is present", () => {
    const req = makeRequest({});
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("rejects a wrong Bearer secret", () => {
    const req = makeRequest({ authorization: `Bearer not-the-real-one` });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("rejects a wrong x-cron-secret value", () => {
    const req = makeRequest({ "x-cron-secret": "wrong" });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("rejects 'Bearer' prefix used in the wrong header", () => {
    const req = makeRequest({ "x-cron-secret": `Bearer ${SECRET}` });
    expect(isAuthorizedCron(req)).toBe(false);
  });

  it("rejects bare secret value passed as Authorization (must include 'Bearer ' prefix)", () => {
    const req = makeRequest({ authorization: SECRET });
    expect(isAuthorizedCron(req)).toBe(false);
  });
});
