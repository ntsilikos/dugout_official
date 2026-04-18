"use client";

import { useState } from "react";
import type { GradeResult, GradeResponse } from "@/lib/types";
import ImageUpload from "./ImageUpload";
import GradeDisplay from "./GradeDisplay";
import GradeBreakdown from "./GradeBreakdown";
import LoadingState from "./LoadingState";

type AppState = "idle" | "grading" | "results" | "error";

export default function Dugout() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = async (data: {
    base64: string;
    mediaType: string;
    previewUrl: string;
  }) => {
    setImagePreview(data.previewUrl);
    setAppState("grading");
    setError(null);

    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data.base64, mediaType: data.mediaType }),
      });

      const result: GradeResponse = await response.json();

      if (result.success && result.result) {
        setGradeResult(result.result);
        setAppState("results");
      } else {
        setError(result.error || "Failed to grade card");
        setAppState("error");
      }
    } catch {
      setError("Failed to connect to grading service. Please try again.");
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setImagePreview(null);
    setGradeResult(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {appState === "idle" && <ImageUpload onImageSelect={handleImageSelect} />}

      {appState === "grading" && <LoadingState />}

      {appState === "error" && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
            Grading Failed
          </p>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{error}</p>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {appState === "results" && gradeResult && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {imagePreview && (
              <div className="flex justify-center">
                <img
                  src={imagePreview}
                  alt="Graded card"
                  className="max-h-96 rounded-xl shadow-lg"
                />
              </div>
            )}
            <GradeDisplay result={gradeResult} />
          </div>

          <GradeBreakdown subGrades={gradeResult.subGrades} />

          <div className="text-center pt-4">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] transition-colors cursor-pointer"
            >
              Grade Another Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
