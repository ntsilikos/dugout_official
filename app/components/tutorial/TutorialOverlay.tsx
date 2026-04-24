"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { TUTORIAL_STEPS } from "./tutorial-steps";
import { useTutorial } from "./TutorialContext";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8; // space around the highlighted element inside the spotlight
const TOOLTIP_GAP = 16; // distance between tooltip and target
const TOOLTIP_WIDTH = 340;

export default function TutorialOverlay() {
  const { currentStep, totalSteps, next, prev, stop } = useTutorial();
  const step = TUTORIAL_STEPS[currentStep];
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // Recompute target rect whenever step changes or window resizes
  useLayoutEffect(() => {
    if (!step) return;

    const update = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (!step.target) {
        setRect(null);
        return;
      }
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      });
      // Scroll the target into view if needed
      el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [step]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stop, next, prev]);

  if (!step) return null;

  const isLast = currentStep >= totalSteps - 1;
  const isFirst = currentStep === 0;

  // Tooltip position
  let tooltipStyle: React.CSSProperties;
  if (!rect) {
    // Centered modal for stepless (welcome/closing) steps
    tooltipStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: TOOLTIP_WIDTH,
      transform: "translate(-50%, -50%)",
    };
  } else {
    // Position based on placement hint, fall back to "bottom" if no room
    const placement = step.placement || "bottom";
    let top = rect.top + rect.height + TOOLTIP_GAP;
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;

    if (placement === "right") {
      top = rect.top + rect.height / 2;
      left = rect.left + rect.width + TOOLTIP_GAP;
    } else if (placement === "left") {
      top = rect.top + rect.height / 2;
      left = rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP;
    } else if (placement === "top") {
      top = rect.top - TOOLTIP_GAP;
      left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    }

    // Clamp into viewport
    const minTop = 20;
    const maxTop = viewport.h - 250;
    const minLeft = 20;
    const maxLeft = viewport.w - TOOLTIP_WIDTH - 20;
    top = Math.max(minTop, Math.min(maxTop, top));
    left = Math.max(minLeft, Math.min(maxLeft, left));

    tooltipStyle = {
      position: "fixed",
      top,
      left,
      width: TOOLTIP_WIDTH,
      transform: placement === "right" || placement === "left" ? "translateY(-50%)" : "none",
    };
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Spotlight: box-shadow technique creates a dim background with a cutout around the target */}
      {rect ? (
        <div
          className="fixed rounded-xl transition-all duration-300 pointer-events-none"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow:
              "0 0 0 9999px rgba(12, 15, 18, 0.75), 0 0 0 2px var(--green), 0 0 24px rgba(46, 204, 113, 0.5)",
          }}
        />
      ) : (
        // No target → full-screen dim (centered modal steps)
        <div className="fixed inset-0 bg-[rgba(12,15,18,0.8)]" />
      )}

      {/* Click-to-close backdrop (only active area is outside the spotlight + tooltip) */}
      <div
        className="fixed inset-0 pointer-events-auto"
        onClick={(e) => {
          // Don't close when clicking the tooltip itself
          if ((e.target as HTMLElement).closest("[data-tutorial-tooltip]")) return;
          // Don't close on every click — user has to use buttons. But a click on the dim area does nothing.
        }}
      />

      {/* Tooltip */}
      <div
        data-tutorial-tooltip
        className="pointer-events-auto bg-[var(--bg-card)] border border-[var(--green)]/40 rounded-xl shadow-[0_24px_80px_rgba(0,0,0,0.6)] p-5"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-[2px] text-[var(--green)] font-bold font-[family-name:var(--font-bebas-neue)]">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            onClick={stop}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Skip tour
          </button>
        </div>

        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 font-[family-name:var(--font-bebas-neue)] tracking-wide">
          {step.title}
        </h3>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
          {step.body}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1 bg-[var(--bg-primary)] rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-[var(--green)] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={isFirst}
            className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            ← Back
          </button>
          <button
            onClick={next}
            className="px-4 py-2 bg-[var(--green)] text-[var(--bg-primary)] text-xs font-bold rounded-md hover:bg-[var(--green-hover)] cursor-pointer font-[family-name:var(--font-bebas-neue)] tracking-wider"
          >
            {isLast ? "DONE" : "NEXT →"}
          </button>
        </div>
      </div>
    </div>
  );
}
