"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Summary {
  totalCards: number;
  inCollectionCount: number;
  listedCount: number;
  soldCount: number;
  inventoryValueCents: number;
  totalCostCents: number;
  totalRevenueCents: number;
  totalProfitCents: number;
  revenue30dCents: number;
  salesCount: number;
  sales30dCount: number;
  byMarketplace: Record<string, { count: number; revenue_cents: number }>;
  sportBreakdown: { sport: string; count: number; valueCents: number }[];
}

const MP_LABELS: Record<string, string> = {
  ebay: "eBay",
  tiktok: "TikTok Shop",
  show: "Card Shows",
};

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/summary")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.totalCards === "number") setSummary(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const downloads = [
    {
      title: "Inventory",
      description: "All cards with value, cost, grade, status, and notes.",
      href: "/api/export/inventory",
      count: summary?.totalCards,
      unit: "cards",
    },
    {
      title: "Listings",
      description: "Every marketplace listing with status, price, and profit.",
      href: "/api/export/listings",
      count: summary ? summary.listedCount + summary.soldCount : undefined,
      unit: "listings",
    },
    {
      title: "Sales",
      description: "All completed sales (marketplaces + card shows) for tax records.",
      href: "/api/export/sales",
      count: summary?.salesCount,
      unit: "sales",
    },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">REPORTS</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 animate-pulse"
            >
              <div className="h-4 bg-[var(--bg-card-hover)] rounded w-20 mb-2" />
              <div className="h-8 bg-[var(--bg-card-hover)] rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">REPORTS</h1>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center">
          <p className="text-[var(--text-muted)]">Could not load report data.</p>
        </div>
      </div>
    );
  }

  const roi =
    summary.totalCostCents > 0
      ? ((summary.totalProfitCents / summary.totalCostCents) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">REPORTS</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Financial summary and data exports for your collection.
        </p>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Inventory Value</p>
          <p className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide text-[var(--text-primary)] mt-1 leading-none">
            {formatCurrency(summary.inventoryValueCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {summary.inCollectionCount + summary.listedCount} cards
          </p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Revenue</p>
          <p className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide text-[var(--green)] mt-1 leading-none">
            {formatCurrency(summary.totalRevenueCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {summary.salesCount} sales
          </p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Profit</p>
          <p
            className={`font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide mt-1 leading-none ${
              summary.totalProfitCents >= 0 ? "text-[var(--green)]" : "text-red-500"
            }`}
          >
            {summary.totalProfitCents >= 0 ? "+" : ""}
            {formatCurrency(summary.totalProfitCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {parseFloat(roi) >= 0 ? "+" : ""}
            {roi}% ROI
          </p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Last 30 Days</p>
          <p className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide text-[var(--text-primary)] mt-1 leading-none">
            {formatCurrency(summary.revenue30dCents)}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {summary.sales30dCount} sales
          </p>
        </div>
      </div>

      {/* Downloads */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">CSV Downloads</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Export your data for taxes, accounting, or offline analysis.
          </p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {downloads.map((d) => (
            <div
              key={d.title}
              className="px-6 py-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-[var(--text-primary)]">{d.title}</p>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">
                  {d.description}
                </p>
                {d.count !== undefined && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {d.count.toLocaleString()} {d.unit}
                  </p>
                )}
              </div>
              <a
                href={d.href}
                download
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg text-sm font-semibold hover:bg-[var(--green-hover)] transition-colors shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download CSV
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Marketplace breakdown */}
      {Object.keys(summary.byMarketplace).length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Sales by Channel
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {Object.entries(summary.byMarketplace)
              .sort(([, a], [, b]) => b.revenue_cents - a.revenue_cents)
              .map(([mp, stats]) => {
                const pct =
                  summary.totalRevenueCents > 0
                    ? (stats.revenue_cents / summary.totalRevenueCents) * 100
                    : 0;
                return (
                  <div key={mp} className="px-6 py-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-medium text-[var(--text-primary)]">
                        {MP_LABELS[mp] || mp}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        {stats.count} {stats.count === 1 ? "sale" : "sales"} &middot;{" "}
                        <span className="text-[var(--green)] font-medium">
                          {formatCurrency(stats.revenue_cents)}
                        </span>
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[var(--green)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Inventory status breakdown */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text-primary)]">
            Inventory Status
          </h2>
        </div>
        <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
          <div className="px-6 py-4 text-center">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              In Collection
            </p>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {summary.inCollectionCount}
            </p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Listed
            </p>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {summary.listedCount}
            </p>
          </div>
          <div className="px-6 py-4 text-center">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide">
              Sold
            </p>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">
              {summary.soldCount}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
