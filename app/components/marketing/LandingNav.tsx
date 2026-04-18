import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface LandingNavProps {
  active?: "features" | "pricing" | "blog";
}

export default async function LandingNav({ active }: LandingNavProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const linkClass = (page: string) =>
    `text-sm font-medium transition-colors ${
      active === page
        ? "text-[var(--text-primary)]"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
    }`;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-12 py-4 border-b border-[var(--border)]"
      style={{
        background: "rgba(12,15,18,0.85)",
        backdropFilter: "blur(20px)",
      }}
    >
      <Link href="/" className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Dugout" className="h-14 w-auto" />
      </Link>
      <div className="hidden md:flex items-center gap-10">
        <Link href="/features" className={linkClass("features")}>
          Features
        </Link>
        <Link href="/pricing" className={linkClass("pricing")}>
          Pricing
        </Link>
        <a href="#blog" className={linkClass("blog")}>
          Blog
        </a>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <Link
            href="/dashboard"
            className="px-6 py-2.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg text-sm font-bold tracking-wider hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.15)] font-[family-name:var(--font-bebas-neue)]"
          >
            GO TO APP
          </Link>
        ) : (
          <>
            <Link
              href="/signup"
              className="px-6 py-2.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg text-sm font-bold tracking-wider hover:bg-[var(--green-hover)] transition-all hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.15)] font-[family-name:var(--font-bebas-neue)]"
            >
              SIGN UP
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 border border-white/15 text-[var(--text-primary)] rounded-lg text-sm font-bold tracking-wider hover:border-white/30 hover:bg-white/[0.04] transition-all font-[family-name:var(--font-bebas-neue)]"
            >
              LOG IN
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
