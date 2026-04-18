import Link from "next/link";
import LandingNav from "@/app/components/marketing/LandingNav";
import LandingFooter from "@/app/components/marketing/LandingFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features — Dugout",
  description:
    "Everything you need to manage, grade, list, and sell sports cards — all in one platform.",
};

const FEATURE_GROUPS = [
  {
    tag: "Inventory",
    title: "YOUR COLLECTION, ORGANIZED",
    desc: "Add cards in seconds — from single scans to bulk uploads.",
    features: [
      {
        title: "AI Scan",
        desc: "Snap a photo. Claude identifies the player, year, set, brand, and grade in under 3 seconds — then auto-fills every field for you.",
        icon: "📸",
      },
      {
        title: "Bulk Scan",
        desc: "Process dozens of cards in parallel with a review queue. Approve or reject each one before it lands in your inventory.",
        icon: "⚡",
      },
      {
        title: "Manual Entry",
        desc: "Prefer control? Enter cards by hand with smart autocomplete for players, brands, and sets.",
        icon: "✍️",
      },
      {
        title: "CSV Import",
        desc: "Migrating from another tool? Drop your export in and Dugout handles the mapping automatically.",
        icon: "📥",
      },
      {
        title: "Cert Lookup",
        desc: "Paste a PSA, BGS, or SGC cert number — we pull the full grade data and populate your card in seconds.",
        icon: "🔖",
      },
      {
        title: "Card Hunter",
        desc: "Save searches and get notified the moment matching cards appear on connected marketplaces.",
        icon: "🔍",
      },
    ],
  },
  {
    tag: "Selling",
    title: "SELL EVERYWHERE, AT ONCE",
    desc: "Cross-list in a single click, delist automatically on sale.",
    features: [
      {
        title: "One-Click Cross-Listing",
        desc: "Push a card to eBay, TikTok Shop, Whatnot, and more simultaneously — no copy-paste, no retyping.",
        icon: "🔗",
      },
      {
        title: "Auto-Delist on Sale",
        desc: "When a card sells on one platform, Dugout pulls it from every other marketplace instantly. No overselling, ever.",
        icon: "🔄",
      },
      {
        title: "AI Listing Generator",
        desc: "Optimized titles, compelling descriptions, and buyer-focused keywords written by Claude Sonnet 4.",
        icon: "✨",
      },
      {
        title: "Price Advisor",
        desc: "Real-time market comps with sold history and active listings — price competitively without guesswork.",
        icon: "💰",
      },
      {
        title: "Show Mode",
        desc: "Live POS for card shows. Scan a card, take payment, update inventory — all in one tap.",
        icon: "🎪",
      },
      {
        title: "Authenticity Check",
        desc: "Claude analyzes your cards for authenticity signals before you list — counterfeits caught before they cost you.",
        icon: "🛡️",
      },
    ],
  },
  {
    tag: "Analytics",
    title: "KNOW YOUR NUMBERS",
    desc: "Every dollar, every card, every trend.",
    features: [
      {
        title: "Portfolio Dashboard",
        desc: "Total value, cost basis, gain/loss, and ROI — at a glance, updated in real time.",
        icon: "📊",
      },
      {
        title: "Daily Snapshots",
        desc: "Your collection's value charted over time so you see trends, not just a today number.",
        icon: "📈",
      },
      {
        title: "AI Weekly Reports",
        desc: "Personalized insights on what's appreciating, what's sitting, and where to focus next.",
        icon: "🤖",
      },
      {
        title: "Sport & Brand Allocation",
        desc: "See how your collection is weighted — and where your money is actually going.",
        icon: "🏆",
      },
      {
        title: "Sales by Channel",
        desc: "Which marketplace drives your revenue? The data's right there, split by platform.",
        icon: "💹",
      },
      {
        title: "Tax-Ready Exports",
        desc: "CSV exports for inventory, listings, and sales — your accountant will thank you.",
        icon: "📑",
      },
    ],
  },
  {
    tag: "Pro Tools",
    title: "POWER TOOLS FOR PROS",
    desc: "Features that scale with your hobby (or your business).",
    features: [
      {
        title: "Set Tracker",
        desc: "Track completion progress across every set you're chasing. Know what's missing at a glance.",
        icon: "📋",
      },
      {
        title: "Repacks",
        desc: "Bundle cards with floor/target/ceiling cost indicators and track profit per repack.",
        icon: "📦",
      },
      {
        title: "Consignment",
        desc: "Manage cards owned by others with automatic commission tracking and payout reports.",
        icon: "🤝",
      },
      {
        title: "AI Grade Breakdown",
        desc: "Per-subgrade analysis (centering, corners, edges, surface) with specific notes on each card.",
        icon: "🎯",
      },
      {
        title: "Bulk Delete & Select",
        desc: "Manage inventory at scale. Filter, select, and act on dozens of cards at once.",
        icon: "☑️",
      },
      {
        title: "Cert-Backed Grades",
        desc: "Dugout recognizes and displays PSA, BGS, SGC, and CGC grades with full cert data.",
        icon: "🏅",
      },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <LandingNav active="features" />

      {/* HERO */}
      <section className="relative pt-36 pb-16 px-6 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(46,204,113,0.12) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-[1100px] mx-auto text-center">
          <p className="text-xs uppercase tracking-[3px] text-[var(--green)] mb-5 font-semibold">
            Features
          </p>
          <h1 className="font-[family-name:var(--font-bebas-neue)] text-5xl sm:text-6xl lg:text-7xl tracking-wider mb-6 leading-[0.95]">
            EVERYTHING YOU NEED.<br />
            <span className="text-[var(--green)]">NOTHING YOU DON&apos;T.</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Dugout bundles inventory, cross-listing, analytics, and pro tools into one platform — so you can spend less time on spreadsheets and more time on cards.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center px-7 py-3.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.2)]"
            >
              Start Free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-7 py-3.5 border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-card)] transition-all"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE GROUPS */}
      {FEATURE_GROUPS.map((group, i) => (
        <section
          key={group.tag}
          className={`py-20 px-6 border-t border-[var(--border)] ${
            i % 2 === 1 ? "bg-[var(--bg-card)]" : ""
          }`}
        >
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs uppercase tracking-[3px] text-[var(--green)] mb-3 font-semibold">
                {group.tag}
              </p>
              <h2 className="font-[family-name:var(--font-bebas-neue)] text-4xl sm:text-5xl tracking-wider mb-3 leading-tight">
                {group.title}
              </h2>
              <p className="text-[var(--text-secondary)]">{group.desc}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.features.map((f) => (
                <div
                  key={f.title}
                  className={`rounded-xl p-6 border transition-colors ${
                    i % 2 === 1
                      ? "bg-[var(--bg-primary)] border-[var(--border)] hover:border-[rgba(46,204,113,0.25)]"
                      : "bg-[var(--bg-card)] border-[var(--border)] hover:border-[rgba(46,204,113,0.25)]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-[10px] bg-[rgba(46,204,113,0.15)] border border-[rgba(46,204,113,0.2)] flex items-center justify-center text-lg mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="py-24 px-6 text-center relative border-t border-[var(--border)]">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(46,204,113,0.15) 0%, transparent 70%)",
          }}
        />
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-5xl sm:text-6xl tracking-wider mb-4 relative leading-none">
          READY TO <span className="text-[var(--green)]">WIN?</span>
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-9 relative">
          Start free. Upgrade when you need more. No transaction fees, ever.
        </p>
        <div className="flex flex-wrap justify-center gap-3 relative">
          <Link
            href="/signup"
            className="inline-block px-9 py-3.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold text-base hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.15)]"
          >
            Start Selling Free
          </Link>
          <Link
            href="/pricing"
            className="inline-block px-9 py-3.5 border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg font-semibold text-base hover:bg-[var(--bg-card)] transition-all"
          >
            View Pricing
          </Link>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
