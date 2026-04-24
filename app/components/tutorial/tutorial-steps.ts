export interface TutorialStep {
  // If target is null, the step renders as a centered modal with no spotlight.
  // Otherwise, target is a CSS selector (usually a `[data-tutorial="..."]` attribute)
  target: string | null;
  title: string;
  body: string;
  // Preferred tooltip placement relative to the target
  placement?: "top" | "bottom" | "left" | "right";
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    target: null,
    title: "Welcome to Dugout",
    body:
      "Let's take a 60-second tour of your new card command center. You can skip anytime — and replay this whenever you want from the sidebar.",
  },
  {
    target: '[data-tutorial="sidebar-dashboard"]',
    title: "Dashboard",
    body:
      "Your at-a-glance view. Collection value, daily change, top cards, recent pickups, and sport breakdown — all on one screen.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-inventory"]',
    title: "Inventory",
    body:
      "Every card you own lives here. Scan photos, bulk upload, or enter manually. AI identifies the player, year, set, and variant automatically.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-listings"]',
    title: "Listings",
    body:
      "Cross-list to eBay, TikTok Shop, Whatnot, and more — all from one place. When a card sells anywhere, Dugout auto-delists it from the others.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-hunter"]',
    title: "Card Hunter",
    body:
      "Looking for specific cards? Save searches and get notified the moment matching listings show up on any connected marketplace.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-sets"]',
    title: "Set Tracker",
    body:
      "Chasing a set? Track completion progress per card. Know exactly what's still missing and hunt just those with one click.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-repacks"]',
    title: "Repacks",
    body:
      "Bundle cards into repacks with floor/target/ceiling cost indicators. Track profit per bundle. Save templates to clone later.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-consignment"]',
    title: "Consignment",
    body:
      "Manage cards owned by others with automatic commission tracking and payout reports. Perfect for brokers and LCS owners.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-portfolio"]',
    title: "Portfolio",
    body:
      "Collection value over time, gain/loss, ROI, sport allocation. Run an appraisal to refresh every card's price from real sold-sale data.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-insights"]',
    title: "AI Insights",
    body:
      "AI-generated weekly reports on what's appreciating, what's sitting, and where to focus. Personalized to your collection.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-reports"]',
    title: "Reports",
    body:
      "Tax-ready CSV exports of inventory, listings, and sales. Breakdown by channel and profit. Your accountant will thank you.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-show"]',
    title: "Show Mode",
    body:
      "Live POS for card shows. Scan a card, accept payment, update inventory — all in one tap. Sales log persists across a show.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-settings"]',
    title: "Settings & Connections",
    body:
      "Connect your eBay, TikTok Shop, and other marketplace accounts here. Required before you can cross-list or pull live prices.",
    placement: "right",
  },
  {
    target: '[data-tutorial="sidebar-replay"]',
    title: "You're all set!",
    body:
      "Click this button anytime to replay this tour. Now scan your first card and watch Dugout go to work.",
    placement: "right",
  },
];
