"use client";

import Link from "next/link";
import type { Card } from "@/lib/types";
import { formatCurrency, getCardTitle } from "@/lib/utils";
import GradeBadge from "@/app/components/GradeBadge";

interface CardGridProps {
  cards: Card[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export default function CardGrid({
  cards,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
        <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-[var(--text-muted)]">No cards found matching your filters.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {cards.map((card) => {
        const primaryImage = card.images?.find((img) => img.is_primary);
        const isSelected = selectedIds?.has(card.id) ?? false;

        const cardContent = (
          <>
            <div className="aspect-[2.5/3.5] bg-[var(--bg-card-hover)] relative">
              {primaryImage?.url ? (
                <img
                  src={primaryImage.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              {card.grade_value && (
                <div className="absolute top-2 right-2">
                  <GradeBadge grade={card.grade_value} size="sm" />
                </div>
              )}
              {selectionMode && (
                <div
                  className={`absolute top-2 left-2 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-[var(--green)] border-[var(--green)]"
                      : "bg-black/50 border-white/40 backdrop-blur-sm"
                  }`}
                >
                  {isSelected && (
                    <svg className="w-4 h-4 text-[var(--bg-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}
              {selectionMode && isSelected && (
                <div className="absolute inset-0 ring-2 ring-[var(--green)] ring-inset rounded-t-xl pointer-events-none" />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--green)] transition-colors">
                {getCardTitle(card)}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-[var(--text-muted)]">{card.sport || "Unknown"}</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatCurrency(card.estimated_value_cents)}
                </span>
              </div>
            </div>
          </>
        );

        if (selectionMode) {
          return (
            <button
              key={card.id}
              onClick={() => onToggleSelect?.(card.id)}
              className={`bg-[var(--bg-card)] rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all text-left cursor-pointer group ${
                isSelected ? "border-[var(--green)]" : "border-[var(--border)]"
              }`}
            >
              {cardContent}
            </button>
          );
        }

        return (
          <Link
            key={card.id}
            href={`/inventory/${card.id}`}
            className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
          >
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}
