import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="py-12 px-6 border-t border-[var(--border)] max-w-[1200px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Dugout" className="h-14 w-auto opacity-70" />
      <div className="flex gap-6 flex-wrap justify-center">
        <Link
          href="/features"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Features
        </Link>
        <Link
          href="/pricing"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          Pricing
        </Link>
        {["Help", "Twitter", "Instagram"].map((link) => (
          <a
            key={link}
            href="#"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {link}
          </a>
        ))}
      </div>
    </footer>
  );
}
