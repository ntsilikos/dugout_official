import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProvider } from "@/lib/marketplaces/registry";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // user ID passed from connect route
  const localhost = "http://localhost:3000";

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/settings?error=tiktok_auth_failed", localhost)
    );
  }

  try {
    const provider = getProvider("tiktok");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || localhost;
    const redirectUri = `${appUrl}/api/tiktok/callback`;
    const tokens = await provider.exchangeCode(code, redirectUri);

    const supabase = createAdminClient();
    await supabase.from("marketplace_connections").upsert(
      {
        user_id: state,
        marketplace: "tiktok",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.token_expires_at,
        marketplace_user_id: tokens.marketplace_user_id || null,
        marketplace_username: tokens.marketplace_username || null,
        is_active: true,
      },
      { onConflict: "user_id,marketplace" }
    );

    return NextResponse.redirect(
      new URL("/settings?connected=tiktok", localhost)
    );
  } catch (err) {
    console.error("TikTok callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=tiktok_auth_failed", localhost)
    );
  }
}
