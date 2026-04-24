"use client";

import { useState, useEffect } from "react";
import type { Card } from "@/lib/types";
import { getCardTitle, formatCurrency } from "@/lib/utils";

interface CardPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (cardIds: string[]) => void;
  excludeCardIds?: string[];
  // Current repack being edited — so we show cards in OTHER active repacks as
  // unavailable. If omitted, any card in ANY active repack is excluded.
  currentRepackId?: string;
}

export default function CardPicker({
  isOpen,
  onClose,
  onSelect,
  excludeCardIds = [],
  currentRepackId,
}: CardPickerProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyCount, setBusyCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelected(new Set());
    const qs = new URLSearchParams({ limit: "50", q: search });
    if (currentRepackId) qs.set("exclude_repack_id", currentRepackId);
    fetch(`/api/repacks/available-cards?${qs.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const available = (data.cards || []).filter(
          (c: Card) => !excludeCardIds.includes(c.id)
        );
        setCards(available);
        setBusyCount(data.busyCount || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isOpen, search, excludeCardIds, currentRepackId]);

  const toggleCard = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    onSelect(Array.from(selected));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[var(--text-primary)]">Add Cards to Repack</h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search cards..."
            className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
          />
          {busyCount > 0 && (
            <p className="text-xs text-[var(--text-muted)] mt-2">
              {busyCount} card{busyCount === 1 ? " is" : "s are"} hidden — already in another active repack.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-[var(--text-muted)] text-sm">Loading...</div>
          ) : cards.length === 0 ? (
            <div className="p-4 text-center text-[var(--text-muted)] text-sm">
              No available cards found
            </div>
          ) : (
            cards.map((card) => (
              <label
                key={card.id}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-[var(--bg-primary)] ${
                  selected.has(card.id) ? "bg-[var(--bg-green-glow)]" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(card.id)}
                  onChange={() => toggleCard(card.id)}
                  className="w-4 h-4 text-[var(--green)] rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {getCardTitle(card)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{card.sport || "Unknown"}</p>
                </div>
                <span className="text-sm font-medium text-[var(--text-secondary)] shrink-0">
                  {formatCurrency(card.estimated_value_cents)}
                </span>
              </label>
            ))
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
          <span className="text-sm text-[var(--text-muted)]">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selected.size === 0}
              className="px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
            >
              Add {selected.size > 0 ? `(${selected.size})` : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
