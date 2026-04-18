interface GradeBadgeProps {
  grade: number;
  size?: "sm" | "lg";
}

function getGradeColor(grade: number): string {
  if (grade >= 10) return "bg-emerald-500 text-white";
  if (grade >= 9) return "bg-green-500 text-white";
  if (grade >= 8) return "bg-lime-500 text-white";
  if (grade >= 7) return "bg-yellow-400 text-[var(--text-primary)]";
  if (grade >= 6) return "bg-amber-400 text-[var(--text-primary)]";
  if (grade >= 5) return "bg-orange-400 text-white";
  if (grade >= 4) return "bg-orange-500 text-white";
  if (grade >= 3) return "bg-red-400 text-white";
  if (grade >= 2) return "bg-red-500 text-white";
  return "bg-red-700 text-white";
}

export default function GradeBadge({ grade, size = "sm" }: GradeBadgeProps) {
  const colorClass = getGradeColor(grade);
  const sizeClass =
    size === "lg"
      ? "w-24 h-24 text-4xl font-bold"
      : "w-12 h-12 text-lg font-semibold";

  return (
    <div
      className={`${sizeClass} ${colorClass} rounded-full flex items-center justify-center shadow-lg`}
      aria-label={`Grade: ${grade} out of 10`}
    >
      {grade}
    </div>
  );
}
