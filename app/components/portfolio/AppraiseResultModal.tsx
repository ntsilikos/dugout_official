"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export interface AppraiseResult {
  verified: number;
  flagged: number;
  no_match: number;
  skipped: number;
  total: number;
  old_total_cents: number;
  new_total_cents: number;
}

interface AppraiseResultModalProps {
  isOpen: boolean;
  result: AppraiseResult | null;
  onClose: () => void;
}

// Shown after Appraise Collection runs. Breaks down the result so the user
// knows exactly what got auto-written vs flagged — and gives them a one-click
// path to the review queue for the flagged ones.

export default function AppraiseResultModal({
  isOpen,
  result,
  onClose,
}: AppraiseResultModalProps) {
  if (!isOpen || !result) return null;

  const hasFlagged = result.flagged > 0 || result.no_match > 0;
  const delta = result.new_total_cents - result.old_total_cents;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-bebas-neue)] tracking-wide">
                APPRAISAL COMPLETE
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {result.total} card{result.total === 1 ? "" : "s"} processed
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none cursor-pointer"
            >
              ×
            </button>
          </div>

          {/* Value change */}
          <div className="mt-5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] p-4">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Collection Value
            </p>
            <p className="text-2xl font-[family-name:var(--font-bebas-neue)] tracking-wide text-[var(--text-primary)] mt-1">
              {formatCurrency(result.new_total_cents)}
            </p>
            {delta !== 0 && (
              <p
                className={`text-sm font-medium mt-0.5 ${delta > 0 ? "text-[var(--green)]" : "text-red-400"}`}
              >
                {delta > 0 ? "+" : ""}
                {formatCurrency(delta)} from last appraisal
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div className="mt-5 space-y-2">
            <StatRow
              color="emerald"
              label="Verified"
              count={result.verified}
              hint="High-confidence comp match, value updated."
            />
            {result.flagged > 0 && (
              <StatRow
                color="amber"
                label="Needs review"
                count={result.flagged}
                hint="Low or medium confidence — please spot-check these."
              />
            )}
            {result.no_match > 0 && (
              <StatRow
                color="slate"
                label="No match"
                count={result.no_match}
                hint="No comparable comps found. Existing value left alone."
              />
            )}
            {result.skipped > 0 && (
              <StatRow
                color="slate"
                label="Errors"
                count={result.skipped}
                hint="Something went wrong. Try running the appraisal again."
              />
            )}
          </div>

          {/* CTAs */}
          <div className="mt-6 flex gap-2">
            {hasFlagged && (
              <Link
                href="/inventory?flag=needs_review"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 bg-amber-500 text-[var(--bg-primary)] rounded-lg text-sm font-semibold hover:bg-amber-400 transition-colors text-center cursor-pointer"
              >
                Review {result.flagged + result.no_match} Flagged
              </Link>
            )}
            <button
              onClick={onClose}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                hasFlagged
                  ? "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"
                  : "flex-1 bg-[var(--green)] text-[var(--bg-primary)] hover:bg-[var(--green-hover)]"
              }`}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  color,
  label,
  count,
  hint,
}: {
  color: "emerald" | "amber" | "slate";
  label: string;
  count: number;
  hint: string;
}) {
  const dotClass = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-400",
    slate: "bg-slate-400",
  }[color];

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
      <span className={`w-2 h-2 rounded-full mt-1.5 ${dotClass}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
          <p className="text-lg font-[family-name:var(--font-bebas-neue)] tracking-wide text-[var(--text-primary)]">
            {count}
          </p>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{hint}</p>
      </div>
    </div>
  );
}
