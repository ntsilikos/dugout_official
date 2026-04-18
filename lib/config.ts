export function isEbayConfigured(): boolean {
  const key = process.env.EBAY_APP_ID;
  return !!key && !key.startsWith("your-");
}

export function isTikTokConfigured(): boolean {
  const key = process.env.TIKTOK_APP_KEY;
  return !!key && !key.startsWith("your-");
}

export function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !!key && !key.startsWith("your-");
}

export function isAnthropicConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!key && key.startsWith("sk-ant-");
}

export function isCardHedgeConfigured(): boolean {
  const key = process.env.CARDHEDGE_API_KEY;
  return !!key && !key.startsWith("your-");
}

export function getConfiguredMarketplaces(): string[] {
  const configured: string[] = [];
  if (isEbayConfigured()) configured.push("ebay");
  if (isTikTokConfigured()) configured.push("tiktok");
  return configured;
}
