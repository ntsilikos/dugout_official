"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import ValueChart from "@/app/components/portfolio/ValueChart";
import AppraiseButton from "@/app/components/portfolio/AppraiseButton";

interface PortfolioData {
  totalValueCents: number;
  totalCostCents: number;
  totalCards: number;
  topGainers: { name: string; valueCents: number; costCents: number }[];
  sportBreakdown: { sport: string; valueCents: number; count: number }[];
  lastAppraisedAt: string | null;
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<{ snapshot_date: string; total_value_cents: number }[]>([]);

  const fetchData = useCallback(() => {
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((stats) => {
        if (stats && typeof stats.totalCards === "number") {
          setData({
            totalValueCents: stats.totalValueCents,
            totalCostCents: stats.totalCostCents,
            totalCards: stats.totalCards,
            topGainers: [],
            sportBreakdown: stats.sportBreakdown || [],
            lastAppraisedAt: stats.lastAppraisedAt || null,
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/portfolio/history")
      .then((res) => res.json())
      .then((d) => setSnapshots(d.snapshots || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">PORTFOLIO</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 animate-pulse">
              <div className="h-4 bg-[var(--bg-card-hover)] rounded w-20 mb-2" />
              <div className="h-8 bg-[var(--bg-card-hover)] rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const roi = data && data.totalCostCents > 0
    ? (((data.totalValueCents - data.totalCostCents) / data.totalCostCents) * 100).toFixed(1)
    : "0";
  const gainLoss = data ? data.totalValueCents - data.totalCostCents : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">PORTFOLIO</h1>
        <AppraiseButton
          lastAppraisedAt={data?.lastAppraisedAt ?? null}
          onComplete={fetchData}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Value</p>
          <p className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide text-[var(--green)] mt-1 leading-none">{formatCurrency(data?.totalValueCents)}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total Cost</p>
          <p className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide text-[var(--text-primary)] mt-1 leading-none">{formatCurrency(data?.totalCostCents)}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Gain / Loss</p>
          <p className={`font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide mt-1 leading-none ${gainLoss >= 0 ? "text-[var(--green)]" : "text-red-500"}`}>
            {gainLoss >= 0 ? "+" : ""}{formatCurrency(Math.abs(gainLoss))}
          </p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">ROI</p>
          <p className={`font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wide mt-1 leading-none ${parseFloat(roi) >= 0 ? "text-[var(--green)]" : "text-red-500"}`}>
            {parseFloat(roi) >= 0 ? "+" : ""}{roi}%
          </p>
        </div>
      </div>

      {/* Value Chart */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Collection Value Over Time</h3>
        <ValueChart data={snapshots} />
      </div>

      {/* Sport Allocation */}
      {data && data.sportBreakdown.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Sport Allocation</h3>
          <div className="space-y-3">
            {data.sportBreakdown.map((sport) => {
              const pct = data.totalValueCents > 0
                ? ((sport.valueCents / data.totalValueCents) * 100).toFixed(1)
                : "0";
              return (
                <div key={sport.sport} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--text-secondary)] w-24">{sport.sport}</span>
                    <div className="w-48 bg-[var(--bg-card-hover)] rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-[var(--bg-green-glow)]0"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(sport.valueCents)}</span>
                    <span className="text-xs text-[var(--text-muted)] ml-2">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
