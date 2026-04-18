"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/app/components/ui/Toast";

interface AppraiseButtonProps {
  lastAppraisedAt: string | null;
  onComplete: () => void;
}

function formatTimeRemaining(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return "< 1m";
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export default function AppraiseButton({
  lastAppraisedAt,
  onComplete,
}: AppraiseButtonProps) {
  const toast = useToast();
  const [appraising, setAppraising] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const computeCooldown = useCallback(() => {
    if (!lastAppraisedAt) return 0;
    const end = new Date(lastAppraisedAt).getTime() + COOLDOWN_MS;
    const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    return remaining;
  }, [lastAppraisedAt]);

  useEffect(() => {
    setCooldownSeconds(computeCooldown());
    const interval = setInterval(() => {
      const remaining = computeCooldown();
      setCooldownSeconds(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 60000);
    return () => clearInterval(interval);
  }, [computeCooldown]);

  const handleAppraise = async () => {
    setAppraising(true);
    try {
      const res = await fetch("/api/cards/appraise", { method: "POST" });
      const data = await res.json();

      if (res.status === 429) {
        setCooldownSeconds(data.cooldown_remaining_seconds || 0);
        toast.error(
          `Please wait ${formatTimeRemaining(data.cooldown_remaining_seconds)} before appraising again.`
        );
        return;
      }

      if (!res.ok) {
        toast.error(data.error || "Appraisal failed");
        return;
      }

      const oldVal = ((data.old_total_cents || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
      const newVal = ((data.new_total_cents || 0) / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
      const changeMsg = data.old_total_cents !== data.new_total_cents
        ? ` Value: ${oldVal} → ${newVal}`
        : "";
      toast.success(
        `${data.updated} card${data.updated === 1 ? "" : "s"} appraised.${changeMsg}`
      );
      setCooldownSeconds(COOLDOWN_MS / 1000);
      onComplete();
    } catch {
      toast.error("Appraisal failed. Please try again.");
    } finally {
      setAppraising(false);
    }
  };

  const onCooldown = cooldownSeconds > 0;
  const disabled = appraising || onCooldown;

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleAppraise}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wider font-[family-name:var(--font-bebas-neue)] transition-all cursor-pointer ${
          disabled
            ? "bg-[var(--bg-card-hover)] text-[var(--text-muted)] cursor-not-allowed"
            : "bg-[var(--green)] text-[var(--bg-primary)] hover:bg-[var(--green-hover)] hover:-translate-y-px shadow-[0_0_24px_rgba(46,204,113,0.15)]"
        }`}
      >
        {appraising ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            APPRAISING...
          </>
        ) : onCooldown ? (
          `AVAILABLE IN ${formatTimeRemaining(cooldownSeconds).toUpperCase()}`
        ) : (
          "APPRAISE COLLECTION"
        )}
      </button>
      {lastAppraisedAt && (
        <p className="text-xs text-[var(--text-muted)]">
          Last appraised: {formatRelativeTime(lastAppraisedAt)}
        </p>
      )}
    </div>
  );
}
