import { formatCurrency } from "@/lib/utils";

interface DataPoint {
  snapshot_date: string;
  total_value_cents: number;
}

interface ValueChartProps {
  data: DataPoint[];
}

export default function ValueChart({ data }: ValueChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-64 flex items-center justify-center bg-[var(--bg-primary)] rounded-lg">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          <p className="text-sm text-[var(--text-muted)]">
            {data.length === 0
              ? "No data yet. Snapshots are collected daily."
              : "Need at least 2 data points to show a chart."}
          </p>
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.total_value_cents);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 800;
  const height = 240;
  const padding = { top: 20, right: 20, bottom: 30, left: 20 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.total_value_cents - minVal) / range) * chartH;
    return `${x},${y}`;
  });

  const polyline = points.join(" ");

  // Area fill under the line
  const areaPoints = [
    `${padding.left},${padding.top + chartH}`,
    ...points,
    `${padding.left + chartW},${padding.top + chartH}`,
  ].join(" ");

  const lastPoint = data[data.length - 1];
  const firstPoint = data[0];
  const change = lastPoint.total_value_cents - firstPoint.total_value_cents;
  const lineColor = change >= 0 ? "#22c55e" : "#ef4444";
  const fillColor = change >= 0 ? "#22c55e20" : "#ef444420";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-[var(--text-muted)]">
          {new Date(firstPoint.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" — "}
          {new Date(lastPoint.snapshot_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
        <span className={`text-sm font-medium ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
          {change >= 0 ? "+" : ""}{formatCurrency(change)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = padding.top + chartH * (1 - pct);
          return (
            <line
              key={pct}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}
        {/* Area fill */}
        <polygon points={areaPoints} fill={fillColor} />
        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End dot */}
        {(() => {
          const lastPt = points[points.length - 1].split(",");
          return (
            <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={lineColor} />
          );
        })()}
      </svg>
    </div>
  );
}
