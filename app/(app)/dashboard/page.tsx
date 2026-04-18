"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Card, DashboardStats } from "@/lib/types";
import StatsGrid from "@/app/components/dashboard/StatsGrid";
import SportBreakdown from "@/app/components/dashboard/SportBreakdown";
import RecentCards from "@/app/components/dashboard/RecentCards";
import TopCards from "@/app/components/dashboard/TopCards";

interface ExtendedStats extends DashboardStats {
  topCards: Card[];
  dailyChangeCents: number | null;
}

const DISPLAY_FONT = "font-[family-name:var(--font-bebas-neue)]";

export default function DashboardPage() {
  const [stats, setStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.totalCards === "number") {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className={`${DISPLAY_FONT} text-4xl tracking-wider text-[var(--text-primary)]`}>
          DASHBOARD
        </h1>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`${i === 0 ? "col-span-2" : ""} bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm animate-pulse`}
            >
              <div className="h-3 bg-[var(--bg-card-hover)] rounded w-20 mb-2" />
              <div className="h-10 bg-[var(--bg-card-hover)] rounded w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats || stats.totalCards === 0) {
    return (
      <div className="space-y-6">
        <h1 className={`${DISPLAY_FONT} text-4xl tracking-wider text-[var(--text-primary)]`}>
          DASHBOARD
        </h1>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Your collection is empty
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Scan your first card to get started with AI-powered grading and inventory management.
          </p>
          <Link
            href="/inventory/add"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold hover:bg-[var(--green-hover)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Your First Card
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className={`${DISPLAY_FONT} text-4xl tracking-wider text-[var(--text-primary)]`}>
        DASHBOARD
      </h1>

      <StatsGrid
        totalCards={stats.totalCards}
        totalValueCents={stats.totalValueCents}
        totalCostCents={stats.totalCostCents}
        cardsListed={stats.cardsListed}
        cardsSold={stats.cardsSold}
        dailyChangeCents={stats.dailyChangeCents}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopCards cards={stats.topCards} />
        <RecentCards cards={stats.recentCards} />
      </div>

      <SportBreakdown data={stats.sportBreakdown} />
    </div>
  );
}
