"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SPORTS = ["Baseball", "Basketball", "Football", "Hockey", "Soccer"];
const STATUSES = [
  { value: "in_collection", label: "In Collection" },
  { value: "listed", label: "Listed" },
  { value: "sold", label: "Sold" },
];

export default function CardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/inventory?${params.toString()}`);
  };

  const flagActive = searchParams.get("flag") === "needs_review";

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search cards..."
            defaultValue={searchParams.get("q") || ""}
            onChange={(e) => updateParam("q", e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
          />
        </div>
        <select
          defaultValue={searchParams.get("sport") || ""}
          onChange={(e) => updateParam("sport", e.target.value)}
          className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
        >
          <option value="">All Sports</option>
          {SPORTS.map((sport) => (
            <option key={sport} value={sport}>{sport}</option>
          ))}
        </select>
        <select
          defaultValue={searchParams.get("status") || ""}
          onChange={(e) => updateParam("status", e.target.value)}
          className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => updateParam("flag", flagActive ? "" : "needs_review")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            flagActive
              ? "bg-amber-500/15 border border-amber-500/40 text-amber-400"
              : "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
          }`}
          title="Cards whose last appraisal needs your review"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M4.93 19h14.14c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.2 16c-.77 1.33.19 3 1.73 3z" />
          </svg>
          Needs Review
          {flagActive && (
            <span
              className="ml-1 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                updateParam("flag", "");
              }}
            >
              ×
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
