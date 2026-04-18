import type { GradeResult } from "@/lib/types";
import GradeBadge from "./GradeBadge";

interface GradeDisplayProps {
  result: GradeResult;
}

export default function GradeDisplay({ result }: GradeDisplayProps) {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <GradeBadge grade={result.overallGrade} size="lg" />
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">
          {result.overallLabel}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">PSA {result.overallGrade}</p>
      </div>
      <div className="bg-[var(--bg-primary)] rounded-lg px-4 py-3 w-full">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          {result.cardIdentification}
        </p>
      </div>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {result.explanation}
      </p>
    </div>
  );
}
