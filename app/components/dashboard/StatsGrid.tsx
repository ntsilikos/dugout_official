import { formatCurrency } from "@/lib/utils";

interface StatsGridProps {
  totalCards: number;
  totalValueCents: number;
  totalCostCents: number;
  cardsListed: number;
  cardsSold: number;
  dailyChangeCents?: number | null;
  totalRevenueCents?: number;
}

const DISPLAY_FONT = "font-[family-name:var(--font-bebas-neue)]";

export default function StatsGrid({
  totalCards,
  totalValueCents,
  totalCostCents,
  cardsListed,
  cardsSold,
  dailyChangeCents,
  totalRevenueCents = 0,
}: StatsGridProps) {
  const gainLoss = totalValueCents - totalCostCents;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Featured: Collection Value with trend */}
      <div className="col-span-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(46,204,113,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">
            Collection Value
          </p>
          <p className={`${DISPLAY_FONT} text-5xl lg:text-6xl text-[var(--green)] mt-1 leading-none tracking-wide`}>
            {formatCurrency(totalValueCents)}
          </p>
          {dailyChangeCents != null && dailyChangeCents !== 0 && (
            <p
              className={`text-sm font-semibold mt-2 flex items-center gap-1 ${
                dailyChangeCents > 0 ? "text-[var(--green)]" : "text-red-500"
              }`}
            >
              <svg
                className={`w-4 h-4 ${dailyChangeCents < 0 ? "rotate-180" : ""}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M7 14l5-5 5 5z" />
              </svg>
              {dailyChangeCents > 0 ? "+" : ""}
              {formatCurrency(dailyChangeCents)} Today
            </p>
          )}
        </div>
      </div>

      {/* Gain/Loss */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">
          Gain / Loss
        </p>
        <p
          className={`${DISPLAY_FONT} text-4xl mt-1 leading-none tracking-wide ${
            gainLoss >= 0 ? "text-[var(--green)]" : "text-red-500"
          }`}
        >
          {gainLoss >= 0 ? "+" : "-"}
          {formatCurrency(Math.abs(gainLoss))}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          {totalCostCents > 0
            ? `${((gainLoss / totalCostCents) * 100).toFixed(1)}% ROI`
            : "No cost basis"}
        </p>
      </div>

      {/* Cards */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">
          Total Cards
        </p>
        <p className={`${DISPLAY_FONT} text-4xl text-[var(--text-primary)] mt-1 leading-none tracking-wide`}>
          {totalCards.toLocaleString()}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-2">in collection</p>
      </div>

      {/* Activity */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-medium">
          Activity
        </p>
        <div className="flex gap-4 mt-1">
          <div>
            <p className={`${DISPLAY_FONT} text-3xl text-[var(--text-primary)] leading-none tracking-wide`}>
              {cardsListed}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">
              Listed
            </p>
          </div>
          <div>
            <p className={`${DISPLAY_FONT} text-3xl text-[var(--green)] leading-none tracking-wide`}>
              {cardsSold}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mt-1">
              Sold
            </p>
          </div>
        </div>
        {totalRevenueCents > 0 && (
          <div className="mt-3 pt-3 border-t border-[var(--border)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
              Total Revenue
            </p>
            <p className={`${DISPLAY_FONT} text-xl text-[var(--green)] leading-none tracking-wide mt-0.5`}>
              {formatCurrency(totalRevenueCents)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
