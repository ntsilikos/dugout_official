import { formatCurrency } from "@/lib/utils";

interface CostIndicatorProps {
  currentCents: number;
  floorCents: number | null;
  targetCents: number | null;
  ceilingCents: number | null;
}

export default function CostIndicator({
  currentCents,
  floorCents,
  targetCents,
  ceilingCents,
}: CostIndicatorProps) {
  const max = ceilingCents || targetCents || currentCents || 100;
  const percent = max > 0 ? Math.min((currentCents / max) * 100, 100) : 0;

  let barColor = "bg-green-500";
  if (ceilingCents && currentCents > ceilingCents) {
    barColor = "bg-red-500";
  } else if (targetCents && currentCents > targetCents) {
    barColor = "bg-yellow-500";
  } else if (floorCents && currentCents < floorCents) {
    barColor = "bg-blue-400";
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--text-secondary)]">
          Current: {formatCurrency(currentCents)}
        </span>
        {targetCents && (
          <span className="text-[var(--text-muted)]">
            Target: {formatCurrency(targetCents)}
          </span>
        )}
      </div>
      <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-3 relative">
        <div
          className={`h-3 rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
        {floorCents && max > 0 && (
          <div
            className="absolute top-0 w-0.5 h-3 bg-blue-600"
            style={{ left: `${(floorCents / max) * 100}%` }}
            title={`Floor: ${formatCurrency(floorCents)}`}
          />
        )}
        {targetCents && max > 0 && (
          <div
            className="absolute top-0 w-0.5 h-3 bg-green-600"
            style={{ left: `${(targetCents / max) * 100}%` }}
            title={`Target: ${formatCurrency(targetCents)}`}
          />
        )}
      </div>
      <div className="flex justify-between text-xs text-[var(--text-muted)]">
        {floorCents ? <span>Floor: {formatCurrency(floorCents)}</span> : <span />}
        {ceilingCents && <span>Ceiling: {formatCurrency(ceilingCents)}</span>}
      </div>
    </div>
  );
}
