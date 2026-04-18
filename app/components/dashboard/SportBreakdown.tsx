"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface SportBreakdownProps {
  data: { sport: string; count: number; valueCents: number }[];
}

const SPORT_COLORS: Record<string, string> = {
  Baseball: "bg-red-500",
  Basketball: "bg-orange-500",
  Football: "bg-green-600",
  Hockey: "bg-blue-500",
  Soccer: "bg-purple-500",
  Unknown: "bg-gray-400",
};

type Mode = "value" | "count";

export default function SportBreakdown({ data }: SportBreakdownProps) {
  const [mode, setMode] = useState<Mode>("value");

  if (data.length === 0) return null;

  // Sort descending by current mode for visual clarity
  const sorted = [...data].sort((a, b) =>
    mode === "value" ? b.valueCents - a.valueCents : b.count - a.count
  );

  const total = sorted.reduce(
    (sum, d) => sum + (mode === "value" ? d.valueCents : d.count),
    0
  );

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--text-primary)]">By Sport</h3>
        <div className="flex gap-1 bg-[var(--bg-card-hover)] p-0.5 rounded-md">
          <button
            onClick={() => setMode("value")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              mode === "value"
                ? "bg-[var(--bg-card)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Value
          </button>
          <button
            onClick={() => setMode("count")}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
              mode === "count"
                ? "bg-[var(--bg-card)] text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Count
          </button>
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((item) => {
          const metric = mode === "value" ? item.valueCents : item.count;
          const pct = total > 0 ? (metric / total) * 100 : 0;
          return (
            <div key={item.sport}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-[var(--text-secondary)]">
                  {item.sport}
                </span>
                <span className="text-[var(--text-muted)]">
                  {item.count} {item.count === 1 ? "card" : "cards"} &middot;{" "}
                  {formatCurrency(item.valueCents)}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    SPORT_COLORS[item.sport] || SPORT_COLORS.Unknown
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
