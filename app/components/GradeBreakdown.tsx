import type { SubGrade } from "@/lib/types";
import GradeBadge from "./GradeBadge";

const CATEGORY_ICONS: Record<string, string> = {
  centering: "⊞",
  corners: "◢",
  edges: "▬",
  surface: "◻",
};

const CATEGORY_LABELS: Record<string, string> = {
  centering: "Centering",
  corners: "Corners",
  edges: "Edges",
  surface: "Surface",
};

interface GradeBreakdownProps {
  subGrades: SubGrade[];
}

export default function GradeBreakdown({ subGrades }: GradeBreakdownProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {subGrades.map((sub) => (
        <div
          key={sub.category}
          className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 flex gap-4 items-start shadow-sm"
        >
          <GradeBadge grade={sub.score} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{CATEGORY_ICONS[sub.category]}</span>
              <h3 className="font-semibold text-[var(--text-primary)]">
                {CATEGORY_LABELS[sub.category]}
              </h3>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{sub.notes}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
