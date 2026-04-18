import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LandingNav from "@/app/components/marketing/LandingNav";
import LandingFooter from "@/app/components/marketing/LandingFooter";

const FEATURE_STRIP = [
  {
    title: "TRACK YOUR VALUE",
    desc: "Monitor your collection worth.",
    icon: "/trackinventoryicon.png",
  },
  {
    title: "ORGANIZE YOUR CARDS",
    desc: "Categorize and Sort Easily.",
    icon: "/organizeicon.png",
  },
  {
    title: "BUY, SELL, & TRADE",
    desc: "Find deals and make trades.",
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
    icon: "⚡",
    title: "Instant Cross-Listing",
    desc: "List on eBay, Whatnot, TikTok Shop, and more simultaneously. One click, every marketplace.",
  },
  {
    icon: "🔄",
    title: "Auto-Delist on Sale",
    desc: "When a card sells on one platform, Dugout instantly removes it everywhere else. No overselling.",
  },
  {
    icon: "📸",
    title: "Scan & List in Seconds",
    desc: "Scan your cards, auto-populate titles and descriptions, and go live in seconds — not hours.",
  },
  {
    icon: "📊",
    title: "Smart Analytics",
    desc: "Track what's selling, what's sitting, and where your buyers are coming from across every channel.",
  },
  {
    icon: "💰",
    title: "Pricing Intelligence",
    desc: "See real-time market comps and price your cards competitively across platforms.",
  },
  {
    icon: "📦",
    title: "Inventory Management",
    desc: "Unlimited inventory. Organize by set, player, grade, or however your brain works.",
  },
];

const STATS = [
  { value: "190%", label: "More Buyer Reach" },
  { value: "3 SEC", label: "Avg Listing Time" },
  { value: "6", label: "Marketplaces" },
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
              Manage Your
              <br />
              Collection
              <br />
              Like a <span className="text-[var(--green)]">Pro.</span>
            </h1>
            <p className="text-lg text-[var(--text-secondary)] max-w-md leading-relaxed mt-6">
              The ultimate platform for tracking, organizing, and valuing your
              sports card collection.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/signup"
                className="inline-flex items-center px-7 py-3.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.2)] hover:shadow-[0_4px_32px_rgba(46,204,113,0.25)]"
              >
                Get Started Free
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
          </div>

          {/* Right: app screenshot */}
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
            <div className="relative rounded-xl overflow-hidden border border-[var(--border-strong)] shadow-[0_24px_80px_rgba(0,0,0,0.6)] bg-[var(--bg-card)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/app-photo.png"
                alt="Dugout dashboard preview"
                className="w-full h-auto block"
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
          <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            Everything you need to run your card business like a pro, without
            the headaches.
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
          Join thousands of sellers who manage their entire card business from
          one dugout.
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
