import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import {
  isEbayConfigured,
  isTikTokConfigured,
  isResendConfigured,
  isAnthropicConfigured,
  isCardHedgeConfigured,
} from "@/lib/config";

export async function GET() {
  return withAuth(async () => {
    return NextResponse.json({
      ebay: isEbayConfigured(),
      tiktok: isTikTokConfigured(),
      resend: isResendConfigured(),
      anthropic: isAnthropicConfigured(),
      cardhedge: isCardHedgeConfigured(),
    });
  });
}
