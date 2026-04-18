import Link from "next/link";
import type { Card } from "@/lib/types";
import { formatCurrency, getCardTitle } from "@/lib/utils";
import GradeBadge from "@/app/components/GradeBadge";

interface TopCardsProps {
  cards: Card[];
}

const DISPLAY_FONT = "font-[family-name:var(--font-bebas-neue)]";

export default function TopCards({ cards }: TopCardsProps) {
  if (cards.length === 0) return null;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className={`${DISPLAY_FONT} text-xl tracking-wider text-[var(--text-primary)]`}>
          TOP CARDS
        </h3>
        <Link
          href="/inventory?sort=estimated_value_cents&order=desc"
          className="text-xs text-[var(--green)] hover:underline font-medium"
        >
          View all
        </Link>
      </div>

      {/* Header row */}
      <div className="px-5 py-2 border-b border-[var(--border)] grid grid-cols-[1fr_80px_100px] gap-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
        <span>Card</span>
        <span className="text-center">Grade</span>
        <span className="text-right">Value</span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {cards.map((card, i) => {
          const primaryImage = card.images?.find((img) => img.is_primary);
          const gradeDisplay = card.grade_value
            ? `${card.grade_company || "AI"} ${card.grade_value}`
            : "Raw";

          return (
            <Link
              key={card.id}
              href={`/inventory/${card.id}`}
              className="grid grid-cols-[1fr_80px_100px] gap-3 items-center px-5 py-3 hover:bg-[var(--bg-card-hover)] transition-colors group"
            >
              {/* Card name with rank + image */}
              <div className="flex items-center gap-3 min-w-0">
                <span className={`${DISPLAY_FONT} text-lg text-[var(--text-muted)] w-4 tracking-wide`}>
                  {i + 1}
                </span>
                {primaryImage?.url ? (
                  <img
                    src={primaryImage.url}
                    alt=""
                    className="w-8 h-11 object-cover rounded shrink-0"
                  />
                ) : (
                  <div className="w-8 h-11 bg-[var(--bg-card-hover)] rounded shrink-0" />
                )}
                <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--green)] transition-colors">
                  {getCardTitle(card)}
                </p>
              </div>

              {/* Grade */}
              <div className="flex justify-center">
                {card.grade_value ? (
                  <div className="flex items-center gap-1.5">
                    <GradeBadge grade={card.grade_value} size="sm" />
                  </div>
                ) : (
                  <span className="text-xs text-[var(--text-muted)]">{gradeDisplay}</span>
                )}
              </div>

              {/* Value */}
              <span className={`${DISPLAY_FONT} text-xl text-[var(--green)] text-right tracking-wide`}>
                {formatCurrency(card.estimated_value_cents)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
