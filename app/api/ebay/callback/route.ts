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
      new URL("/settings?error=ebay_auth_failed", localhost)
    );
  }

  try {
    const provider = getProvider("ebay");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || localhost;
    const redirectUri =
      process.env.EBAY_REDIRECT_URI || `${appUrl}/api/ebay/callback`;
    const tokens = await provider.exchangeCode(code, redirectUri);

    // Use admin client since cookies won't be present when
    // the callback comes through a tunnel (ngrok/localtunnel)
    const supabase = createAdminClient();
    await supabase.from("marketplace_connections").upsert(
      {
        user_id: state,
        marketplace: "ebay",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.token_expires_at,
        marketplace_user_id: tokens.marketplace_user_id || null,
        marketplace_username: tokens.marketplace_username || null,
        is_active: true,
      },
      { onConflict: "user_id,marketplace" }
    );

    // Always redirect back to localhost so auth cookies work
    return NextResponse.redirect(
      new URL("/settings?connected=ebay", localhost)
    );
  } catch (err) {
    console.error("eBay callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=ebay_auth_failed", localhost)
    );
  }
}
