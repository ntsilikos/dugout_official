import Link from "next/link";
import type { Card } from "@/lib/types";
import { formatCurrency, getCardTitle } from "@/lib/utils";
import GradeBadge from "@/app/components/GradeBadge";

interface RecentCardsProps {
  cards: Card[];
}

const DISPLAY_FONT = "font-[family-name:var(--font-bebas-neue)]";

export default function RecentCards({ cards }: RecentCardsProps) {
  if (cards.length === 0) return null;

  // Show up to 4 as "pickups" (image-first cards)
  const pickups = cards.slice(0, 4);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
        <h3 className={`${DISPLAY_FONT} text-xl tracking-wider text-[var(--text-primary)]`}>
          RECENT PICKUPS
        </h3>
        <Link
          href="/inventory"
          className="text-xs text-[var(--green)] hover:underline font-medium"
        >
          View all
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-2 p-4">
        {pickups.map((card) => {
          const primaryImage = card.images?.find((img) => img.is_primary);
          return (
            <Link
              key={card.id}
              href={`/inventory/${card.id}`}
              className="group"
              title={`${getCardTitle(card)} · ${formatCurrency(card.estimated_value_cents)}`}
            >
              <div className="aspect-[2.5/3.5] rounded-lg bg-[var(--bg-card-hover)] overflow-hidden relative">
                {primaryImage?.url ? (
                  <img
                    src={primaryImage.url}
                    alt={getCardTitle(card)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
                {card.grade_value && (
                  <div className="absolute top-1.5 right-1.5">
                    <GradeBadge grade={card.grade_value} size="sm" />
                  </div>
                )}
              </div>
              <p className="text-xs font-medium text-[var(--text-primary)] truncate mt-2 group-hover:text-[var(--green)] transition-colors">
                {getCardTitle(card)}
              </p>
              <p className={`${DISPLAY_FONT} text-base text-[var(--green)] leading-none mt-0.5 tracking-wide`}>
                {formatCurrency(card.estimated_value_cents)}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
