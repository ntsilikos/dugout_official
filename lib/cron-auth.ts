import { NextRequest } from "next/server";

// Accept both Vercel Cron's `Authorization: Bearer <secret>` AND a custom
// `x-cron-secret` header so external schedulers (cron-job.org, EasyCron, etc.)
// can also trigger our cron endpoints.
export function isAuthorizedCron(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${expected}`) return true;
  const xSecret = request.headers.get("x-cron-secret");
  if (xSecret === expected) return true;
  return false;
}
