import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { getProvider } from "@/lib/marketplaces/registry";

export async function GET() {
  return withAuth(async (user) => {
    const provider = getProvider("tiktok");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/tiktok/callback`;
    const state = user.id;
    const authUrl = provider.getAuthUrl(redirectUri, state);
    return NextResponse.redirect(authUrl);
  });
}
