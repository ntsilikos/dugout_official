"use client";

import { useState, useEffect } from "react";

const MESSAGES = [
  "Examining corners...",
  "Checking edges...",
  "Inspecting surface...",
  "Evaluating centering...",
  "Calculating grade...",
];

export default function LoadingState() {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <div className="relative w-48 h-64 rounded-xl border-2 border-dashed border-[var(--green)/30] animate-pulse bg-[var(--bg-green-glow)]">
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-indigo-300 animate-spin"
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
      <p className="text-lg font-medium text-[var(--green)] animate-pulse">
        {MESSAGES[messageIndex]}
      </p>
    </div>
  );
}
