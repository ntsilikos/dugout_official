"use client";

import { useState } from "react";

interface Finding {
  area: string;
  status: "pass" | "warning" | "concern";
  detail: string;
}

interface AuthenticityData {
  trust_score: number;
  risk_level: "low" | "medium" | "high";
  findings: Finding[];
  summary: string;
  recommendation: string;
}

interface AuthenticityResultProps {
  cardId: string;
  hasImage: boolean;
}

export default function AuthenticityResult({ cardId, hasImage }: AuthenticityResultProps) {
  const [data, setData] = useState<AuthenticityData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cards/${cardId}/authenticity`, { method: "POST" });
      const result = await res.json();
      if (result.trust_score !== undefined) {
        setData(result);
      } else {
        setError(result.error || "Failed to check authenticity");
      }
    } catch {
      setError("Failed to connect to authenticity service");
    } finally {
      setLoading(false);
    }
  };

  if (!hasImage) return null;

  if (!data && !loading) {
    return (
      <button
        onClick={handleCheck}
        className="w-full py-2.5 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors cursor-pointer"
      >
        Check Authenticity
      </button>
    );
  }

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm animate-pulse">
        <div className="h-5 bg-[var(--bg-card-hover)] rounded w-40 mb-3" />
        <div className="h-16 bg-[var(--bg-card-hover)] rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
        {error}
        <button onClick={handleCheck} className="ml-2 underline cursor-pointer">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const scoreColor =
    data.trust_score >= 70 ? "bg-green-500" :
    data.trust_score >= 40 ? "bg-yellow-500" : "bg-red-500";

  const riskColors = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };

  const statusIcons = {
    pass: <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    warning: <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    concern: <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
  };

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Authenticity Check</h3>
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${riskColors[data.risk_level]}`}>
            {data.risk_level} risk
          </span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 rounded-full ${scoreColor} flex items-center justify-center text-white text-xl font-bold`}>
            {data.trust_score}
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Trust Score</p>
            <p className="text-xs text-[var(--text-muted)]">out of 100</p>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          {data.findings.map((finding, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="mt-0.5">{statusIcons[finding.status]}</div>
              <div>
                <p className="text-xs font-medium text-[var(--text-secondary)]">{finding.area}</p>
                <p className="text-xs text-[var(--text-muted)]">{finding.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-3">{data.summary}</p>

        <div className="bg-[var(--bg-primary)] rounded-lg p-3">
          <p className="text-xs font-medium text-[var(--text-secondary)] mb-1">Recommendation</p>
          <p className="text-xs text-[var(--text-secondary)]">{data.recommendation}</p>
        </div>
      </div>
    </div>
  );
}
