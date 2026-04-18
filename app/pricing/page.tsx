import Link from "next/link";
import LandingNav from "@/app/components/marketing/LandingNav";
import LandingFooter from "@/app/components/marketing/LandingFooter";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — Dugout",
  description:
    "Simple, transparent pricing. Start free, upgrade when you're ready. Zero transaction fees on every sale.",
};

const PLANS = [
  {
    name: "ROOKIE",
    price: "Free",
    period: "forever",
    tagline: "For casual collectors just getting started.",
    cta: "Start Free",
    ctaHref: "/signup",
    popular: false,
    features: [
      "Up to 50 cards",
      "1 marketplace connection",
      "AI Scan (20/month)",
      "Basic portfolio view",
      "CSV export",
      "Community support",
    ],
  },
  {
    name: "COLLECTOR",
    price: "$9",
    period: "/month",
    tagline: "For hobbyists who want the full Dugout experience.",
    cta: "Start 14-Day Trial",
    ctaHref: "/signup?plan=collector",
    popular: false,
    features: [
      "Unlimited cards",
      "All marketplace connections",
      "Unlimited AI Scan",
      "AI Grading & Authenticity",
      "Cross-listing (eBay, TikTok, more)",
      "Portfolio & daily snapshots",
      "Email support",
    ],
  },
  {
    name: "PRO",
    price: "$29",
    period: "/month",
    tagline: "For serious sellers who run a card business.",
    cta: "Start 14-Day Trial",
    ctaHref: "/signup?plan=pro",
    popular: true,
    features: [
      "Everything in Collector",
      "AI Price Advisor (live comps)",
      "AI Weekly Reports",
      "Card Hunter (unlimited searches)",
      "Show Mode (live POS)",
      "Repacks & Consignment tools",
      "Priority support",
    ],
  },
  {
    name: "ALL-STAR",
    price: "$99",
    period: "/month",
    tagline: "For teams and high-volume shops.",
    cta: "Contact Sales",
    ctaHref: "/signup?plan=all-star",
    popular: false,
    features: [
      "Everything in Pro",
      "Up to 5 team members",
      "Priority listing rotation",
      "Bulk operations API",
      "Dedicated account manager",
      "Phone support",
      "Custom integrations",
    ],
  },
];

const FAQ = [
  {
    q: "Can I cancel anytime?",
    a: "Yep. No contracts, no cancellation fees. Downgrade or cancel with a single click — you'll keep access until the end of your billing period.",
  },
  {
    q: "Do you charge a fee on my sales?",
    a: "No. Dugout charges zero transaction fees — every dollar your cards earn is yours. (Marketplaces still charge their own fees, of course, but that's separate from us.)",
  },
  {
    q: "Can I try before I pay?",
    a: "Every paid plan comes with a 14-day free trial, no credit card required. The Rookie plan is free forever — use it as long as you like.",
  },
  {
    q: "What marketplaces do you support?",
    a: "Today: eBay, TikTok Shop, Whatnot, Shopify, Square, and MyCardPost. We're actively integrating more — Loupe and StockX are next on the roadmap.",
  },
  {
    q: "Is there a fee for switching plans?",
    a: "Nope. Upgrade or downgrade anytime; you'll be prorated automatically. Your data stays put no matter what plan you're on.",
  },
  {
    q: "Do you offer annual pricing?",
    a: "Yes — save 20% when you pay annually. You'll see that option when you start your trial or upgrade.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You keep read-only access for 90 days so you can export everything. After that, your data is deleted permanently (we don't sell it, rent it, or hold it hostage).",
  },
  {
    q: "Is there a student or nonprofit discount?",
    a: "Email us at support@dugout.app with proof of status — we're happy to work something out.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <LandingNav active="pricing" />

      {/* HERO */}
      <section className="relative pt-36 pb-12 px-6 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[700px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(46,204,113,0.12) 0%, transparent 60%)",
          }}
        />
        <div className="relative max-w-[1100px] mx-auto text-center">
          <p className="text-xs uppercase tracking-[3px] text-[var(--green)] mb-5 font-semibold">
            Pricing
          </p>
          <h1 className="font-[family-name:var(--font-bebas-neue)] text-5xl sm:text-6xl lg:text-7xl tracking-wider mb-6 leading-[0.95]">
            SIMPLE PRICING.<br />
            <span className="text-[var(--green)]">NO SURPRISES.</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Free to start. Pay only for what you need. Zero transaction fees on every sale — forever.
          </p>
        </div>
      </section>

      {/* PLANS */}
      <section className="pb-20 px-6">
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.popular
                  ? "bg-[var(--bg-card)] border-2 border-[var(--green)] shadow-[0_0_40px_rgba(46,204,113,0.12)] lg:-translate-y-2"
                  : "bg-[var(--bg-card)] border border-[var(--border)]"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[var(--green)] text-[var(--bg-primary)] text-xs font-bold tracking-wider rounded-full font-[family-name:var(--font-bebas-neue)] whitespace-nowrap">
                  MOST POPULAR
                </div>
              )}
              <h3 className="font-[family-name:var(--font-bebas-neue)] text-3xl tracking-wider text-[var(--text-primary)] mb-2">
                {plan.name}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-5 min-h-[40px]">
                {plan.tagline}
              </p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-[family-name:var(--font-bebas-neue)] text-5xl text-[var(--text-primary)] tracking-wide leading-none">
                  {plan.price}
                </span>
                <span className="text-sm text-[var(--text-muted)]">
                  {plan.period}
                </span>
              </div>
              <Link
                href={plan.ctaHref}
                className={`w-full py-3 rounded-lg text-sm font-bold tracking-wider text-center font-[family-name:var(--font-bebas-neue)] transition-all ${
                  plan.popular
                    ? "bg-[var(--green)] text-[var(--bg-primary)] hover:bg-[var(--green-hover)] shadow-[0_0_24px_rgba(46,204,113,0.2)]"
                    : "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                {plan.cta.toUpperCase()}
              </Link>
              <div className="mt-6 pt-6 border-t border-[var(--border)] flex-1">
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]"
                    >
                      <svg
                        className="w-4 h-4 text-[var(--green)] flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[var(--text-muted)] mt-10">
          All prices in USD. Cancel anytime. Zero transaction fees on every plan.
        </p>
      </section>

      {/* COMPARE STRIP */}
      <section className="py-16 px-6 border-t border-[var(--border)] bg-[var(--bg-card)]">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="font-[family-name:var(--font-bebas-neue)] text-5xl text-[var(--green)] tracking-wide mb-2">
              0%
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Transaction fees. Every dollar you earn is yours.
            </p>
          </div>
          <div>
            <div className="font-[family-name:var(--font-bebas-neue)] text-5xl text-[var(--green)] tracking-wide mb-2">
              14-DAY
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Free trial on any paid plan. No credit card required.
            </p>
          </div>
          <div>
            <div className="font-[family-name:var(--font-bebas-neue)] text-5xl text-[var(--green)] tracking-wide mb-2">
              6+
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              Marketplaces connected. More coming every quarter.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 border-t border-[var(--border)]">
        <div className="max-w-[800px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[3px] text-[var(--green)] mb-3 font-semibold">
              FAQ
            </p>
            <h2 className="font-[family-name:var(--font-bebas-neue)] text-4xl sm:text-5xl tracking-wider mb-3">
              FREQUENTLY ASKED
            </h2>
            <p className="text-[var(--text-secondary)]">
              Everything you need to know about Dugout pricing.
            </p>
          </div>
          <div className="space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-5 py-4 hover:border-[rgba(46,204,113,0.2)] transition-colors open:border-[rgba(46,204,113,0.3)]"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none gap-4">
                  <span className="text-[var(--text-primary)] font-semibold text-[15px]">
                    {item.q}
                  </span>
                  <svg
                    className="w-5 h-5 text-[var(--text-muted)] transition-transform group-open:rotate-45 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </summary>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mt-3">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

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
          STEP UP<br />
          TO THE <span className="text-[var(--green)]">PLATE</span>
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-9 relative">
          Free forever. Upgrade when you need more. No transaction fees, ever.
        </p>
        <Link
          href="/signup"
          className="relative inline-block px-9 py-3.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold text-base hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.15)]"
        >
          Start Selling Free
        </Link>
      </section>

      <LandingFooter />
    </div>
  );
}
