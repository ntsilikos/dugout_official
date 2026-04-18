"use client";

export default function SocialFeedPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">ACTIVITY FEED</h1>

      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
        <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Connect with collectors</h2>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          Follow other collectors, see their latest additions, and send trade offers. Coming soon.
        </p>
      </div>
    </div>
  );
}
