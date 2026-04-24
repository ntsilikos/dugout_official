import type { AppraisalStatus } from "@/lib/types";

interface AppraisalBadgeProps {
  status: AppraisalStatus | null | undefined;
  compCount?: number | null;
  confidence?: number | null;
  reason?: string | null;
  lastAppraisedAt?: string | null;
  size?: "sm" | "md";
}

// Small pill + tooltip that shows whether a card's estimated value is
// trustworthy. Four states:
//   - verified:      green   — high-confidence comp match, auto-written
//   - needs_review:  amber   — low confidence or unusual change, user should check
//   - no_match:      gray    — no comps found, value is stale
//   - null (stale):  nothing — card has never been appraised, don't clutter UI

const STYLES = {
  verified: {
    bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
    dot: "bg-emerald-500",
    label: "Verified",
  },
  needs_review: {
    bg: "bg-amber-500/15 border-amber-500/40 text-amber-400",
    dot: "bg-amber-400",
    label: "Review",
  },
  no_match: {
    bg: "bg-slate-500/15 border-slate-500/40 text-slate-400",
    dot: "bg-slate-400",
    label: "No Match",
  },
} as const;

function relativeDay(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AppraisalBadge({
  status,
  compCount,
  confidence,
  reason,
  lastAppraisedAt,
  size = "sm",
}: AppraisalBadgeProps) {
  if (!status) return null;
  const style = STYLES[status];

  const tooltip = [
    status === "verified"
      ? "Price matched with high confidence."
      : status === "needs_review"
        ? reason || "Appraisal needs your review."
        : "No matching comps found. Value may be stale.",
    typeof compCount === "number" && compCount > 0
      ? `${compCount} comp${compCount === 1 ? "" : "s"}`
      : null,
    typeof confidence === "number" && confidence > 0
      ? `confidence ${Math.round(confidence * 100)}%`
      : null,
    lastAppraisedAt ? `appraised ${relativeDay(lastAppraisedAt)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";
  const text = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border ${padding} ${text} font-medium ${style.bg}`}
      title={tooltip}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
