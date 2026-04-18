"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";

interface Insight {
  id: string;
  report_html: string;
  period_start: string;
  period_end: string;
  created_at: string;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => res.json())
      .then((data) => {
        setInsights(data.insights || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await fetch("/api/insights/generate", { method: "POST" });
    const data = await res.json();
    if (data.insight) {
      setInsights((prev) => [data.insight, ...prev]);
    }
    setGenerating(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">INSIGHTS</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            AI-powered analysis of your collection&apos;s performance
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
        >
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 animate-pulse">
              <div className="h-5 bg-[var(--bg-card-hover)] rounded w-48 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-[var(--bg-card-hover)] rounded w-full" />
                <div className="h-4 bg-[var(--bg-card-hover)] rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No insights yet</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Generate your first AI-powered collection analysis report.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
          >
            {generating ? "Generating..." : "Generate First Report"}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {insights.map((insight) => (
            <div key={insight.id} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-semibold text-[var(--text-primary)]">
                  Weekly Report
                </h3>
                <span className="text-xs text-[var(--text-muted)]">
                  {formatDate(insight.period_start)} — {formatDate(insight.period_end)}
                </span>
              </div>
              <div
                className="px-6 py-4 prose prose-sm max-w-none text-[var(--text-secondary)]"
                dangerouslySetInnerHTML={{ __html: insight.report_html }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
