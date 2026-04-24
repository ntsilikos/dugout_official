import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LandingNav from "@/app/components/marketing/LandingNav";
import LandingFooter from "@/app/components/marketing/LandingFooter";

const FEATURE_STRIP = [
  {
    title: "SCAN IN SECONDS",
    desc: "AI identifies any card from a single photo.",
    icon: "/trackinventoryicon.png",
  },
  {
    title: "PRICE WITH PRECISION",
    desc: "Real sold-sale data, not asking prices.",
    icon: "/organizeicon.png",
  },
  {
    title: "LIST EVERYWHERE AT ONCE",
    desc: "eBay, TikTok Shop, Whatnot — one click.",
    icon: "/buyselltradeicon.png",
  },
];

const MARKETPLACES = [
  { name: "eBay", src: "/ebaylogo.png", className: "h-20" },
  {
    name: "Whatnot",
    src: "/whatnotlogosmall.png",
    className: "h-20 rounded-2xl",
  },
  {
    name: "TikTok Shop",
    src: "/tiktoklogo.png",
    className: "h-20 rounded-2xl",
  },
  { name: "Shopify", src: "/shopifylogo.png", className: "h-20" },
  { name: "Square", src: "/squarelogo.png", className: "h-20" },
  {
    name: "MyCardPost",
    src: "/mycardpostlogo.png",
    className: "h-20 rounded-2xl",
  },
];

const FEATURES = [
  {
    icon: "📸",
    title: "AI Card Scanner",
    desc: "Snap a photo — AI identifies the player, year, set, variant, and grade in under 3 seconds.",
  },
  {
    icon: "💰",
    title: "Real Sold-Sale Pricing",
    desc: "Every estimate is backed by actual recent sales, not inflated asking prices. Know what your cards are really worth.",
  },
  {
    icon: "⚡",
    title: "One-Click Cross-Listing",
    desc: "Push a card to eBay, TikTok Shop, Whatnot, and more — all at once. No copy-paste, no retyping.",
  },
  {
    icon: "🔄",
    title: "Auto-Delist on Sale",
    desc: "When a card sells anywhere, Dugout pulls it from the other marketplaces instantly. Zero overselling.",
  },
  {
    icon: "📊",
    title: "Portfolio Tracking",
    desc: "Total value, gain/loss, daily change, sport breakdown. Your collection's P&L, always up to date.",
  },
  {
    icon: "🔍",
    title: "Card Hunter",
    desc: "Set saved searches for cards you want. Get notified the moment matching listings appear on any marketplace.",
  },
];

const STATS = [
  { value: "SECONDS", label: "To Scan & Identify" },
  { value: "6+", label: "Marketplaces Connected" },
  { value: "0%", label: "Transaction Fees" },
  { value: "$0", label: "To Get Started" },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <LandingNav />

      {/* HERO */}
      <section className="relative min-h-[88vh] flex items-center pt-28 pb-16 overflow-hidden">
        {/* Faded background image */}
        <div className="absolute inset-0 pointer-events-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/faded-background.jpeg"
            alt=""
            className="w-full h-full object-cover opacity-[0.18]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary)]" />
        </div>

        {/* Green radial glow */}
        <div
          className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(46,204,113,0.12) 0%, transparent 60%)",
          }}
        />

        <div className="relative z-10 max-w-[1280px] mx-auto w-full px-6 lg:px-12 grid lg:grid-cols-[1fr_1.15fr] gap-10 lg:gap-14 items-center">
          {/* Left: copy */}
          <div className="animate-fade-up">
            <h1 className="font-[family-name:var(--font-bebas-neue)] text-5xl sm:text-6xl lg:text-7xl xl:text-[88px] leading-[0.95] tracking-wide text-[var(--text-primary)]">
              Every Card.
              <br />
              Every Market.
              <br />
              One <span className="text-[var(--green)]">Dugout.</span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-lg leading-relaxed mt-6">
              AI identifies any card in seconds. Live pricing from real sold sales. One-click listing to eBay, TikTok Shop, Whatnot, and more.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center px-7 py-3.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.2)] hover:shadow-[0_4px_32px_rgba(46,204,113,0.25)]"
              >
                Start Scanning Free
              </Link>
              <a
                href="#preview"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-primary)] rounded-lg font-medium hover:border-white/30 hover:bg-[var(--bg-card-hover)] transition-all"
              >
                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-3 h-3 ml-0.5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                Watch Demo
              </a>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4">
              Free forever. No credit card required.
            </p>
          </div>

          {/* Right: app screenshot — aspect-clamped so it doesn't read as ultra-wide */}
          <div
            className="relative animate-fade-up"
            style={{ animationDelay: "0.15s" }}
          >
            <div
              className="absolute -inset-6 rounded-2xl pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at center, rgba(46,204,113,0.15) 0%, transparent 65%)",
              }}
            />
            <div className="relative rounded-xl overflow-hidden border border-[var(--border-strong)] shadow-[0_24px_80px_rgba(0,0,0,0.6)] bg-[var(--bg-card)] aspect-[16/10]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/app-photo.png"
                alt="Dugout dashboard preview"
                className="w-full h-full object-cover object-left"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section className="relative border-t border-[var(--border)] bg-[var(--bg-primary)]">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 py-16 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {FEATURE_STRIP.map((f) => (
            <div
              key={f.title}
              className="flex flex-col items-center text-center px-6 py-8 md:py-4"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.icon}
                alt=""
                className="w-16 h-16 mb-4 object-contain drop-shadow-[0_4px_20px_rgba(46,204,113,0.25)]"
              />
              <h3 className="font-[family-name:var(--font-bebas-neue)] text-3xl tracking-wider text-[var(--text-primary)]">
                {f.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* LOGOS BAR */}
      <section className="py-16 px-6 text-center border-y border-[var(--border)]">
        <p className="text-xs uppercase tracking-[3px] text-[var(--text-muted)] mb-10">
          Integrated with trusted marketplaces
        </p>
        <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap max-w-[1200px] mx-auto">
          {MARKETPLACES.map((mp) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={mp.name}
              src={mp.src}
              alt={mp.name}
              className={`${mp.className} w-auto opacity-80 hover:opacity-100 transition-opacity`}
            />
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 px-6 max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-[family-name:var(--font-bebas-neue)] text-5xl tracking-wider mb-4">
            BUILT FOR THE HOBBY
          </h2>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
            The tools serious collectors and sellers actually use — not another glorified spreadsheet.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-9 transition-all duration-300 hover:border-[rgba(46,204,113,0.2)] hover:bg-[var(--bg-card-hover)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)]"
            >
              <div className="w-11 h-11 rounded-[10px] bg-[rgba(46,204,113,0.15)] border border-[rgba(46,204,113,0.2)] flex items-center justify-center text-xl mb-5">
                {f.icon}
              </div>
              <h3 className="text-[17px] font-semibold text-[var(--text-primary)] mb-2.5">
                {f.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link
            href="/features"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--green)] hover:gap-3 transition-all"
          >
            See all features
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 px-6 border-y border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-5">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-[family-name:var(--font-bebas-neue)] text-5xl text-[var(--green)] tracking-wide">
                {s.value}
              </div>
              <div className="text-xs uppercase tracking-[2px] text-[var(--text-secondary)] mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center relative">
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(46,204,113,0.15) 0%, transparent 70%)",
          }}
        />
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-6xl tracking-wider mb-4 relative">
          STEP UP
          <br />
          TO THE <span className="text-[var(--green)]">PLATE</span>
        </h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed mb-9 relative">
          Scan your first card in under a minute. No credit card required.
        </p>
        <Link
          href="/signup"
          className="relative inline-block px-9 py-3.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold text-base hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.15)]"
        >
          Start Scanning Free
        </Link>
      </section>

      <LandingFooter />
    </div>
  );
}
