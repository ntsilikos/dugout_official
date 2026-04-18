import type { MarketplaceProvider } from "./types";
import { EbayProvider } from "./ebay";
import { TikTokProvider } from "./tiktok";

const providers: Record<string, MarketplaceProvider> = {
  ebay: new EbayProvider(),
  tiktok: new TikTokProvider(),
};

export function getProvider(marketplace: string): MarketplaceProvider {
  const provider = providers[marketplace];
  if (!provider) {
    throw new Error(`Unknown marketplace: ${marketplace}`);
  }
  return provider;
}

export function getAllProviders(): MarketplaceProvider[] {
  return Object.values(providers);
}

export function getProviderIds(): string[] {
  return Object.keys(providers);
}
