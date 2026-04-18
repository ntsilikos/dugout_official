"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Card } from "@/lib/types";
import CardFilters from "@/app/components/inventory/CardFilters";
import CardGrid from "@/app/components/inventory/CardGrid";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import AppraiseButton from "@/app/components/portfolio/AppraiseButton";
import { useToast } from "@/app/components/ui/Toast";

function InventoryContent() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const [cards, setCards] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lastAppraisedAt, setLastAppraisedAt] = useState<string | null>(null);

  const fetchCards = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    setLoading(true);
    fetch(`/api/cards?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setCards(data.cards || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    fetchCards();
    // Fetch last appraisal time
    fetch("/api/analytics")
      .then((res) => res.json())
      .then((data) => setLastAppraisedAt(data.lastAppraisedAt || null))
      .catch(() => {});
  }, [fetchCards]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  };

  const selectAll = () => setSelectedIds(new Set(cards.map((c) => c.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    try {
      const res = await fetch("/api/cards/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${data.deleted} card${data.deleted === 1 ? "" : "s"}`);
        setCards((prev) => prev.filter((c) => !selectedIds.has(c.id)));
        setTotal((prev) => prev - selectedIds.size);
        setSelectedIds(new Set());
        setSelectionMode(false);
      } else {
        toast.error(data.error || "Delete failed");
      }
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">INVENTORY</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {total} {total === 1 ? "card" : "cards"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleSelectionMode}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              selectionMode
                ? "bg-[var(--bg-card)] border border-[var(--border-strong)] text-[var(--text-primary)]"
                : "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]"
            }`}
          >
            {selectionMode ? "Cancel" : "Select"}
          </button>
          {!selectionMode && (
            <>
              <AppraiseButton
                lastAppraisedAt={lastAppraisedAt}
                onComplete={() => {
                  fetchCards();
                  fetch("/api/analytics")
                    .then((res) => res.json())
                    .then((data) => setLastAppraisedAt(data.lastAppraisedAt || null))
                    .catch(() => {});
                }}
              />
              <Link
                href="/inventory/add"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg text-sm font-semibold hover:bg-[var(--green-hover)] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Card
              </Link>
            </>
          )}
        </div>
      </div>

      {!selectionMode && <CardFilters />}

      {selectionMode && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-3 flex items-center justify-between flex-wrap gap-3 sticky top-0 z-30">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[var(--text-primary)] font-medium">
              {selectedIds.size} selected
            </span>
            <button
              onClick={selectAll}
              className="text-[var(--green)] hover:underline cursor-pointer"
              disabled={selectedIds.size === cards.length}
            >
              Select all ({cards.length})
            </button>
            {selectedIds.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={selectedIds.size === 0 || deleting}
            className="px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {deleting ? "Deleting..." : `Delete ${selectedIds.size || ""}`}
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] overflow-hidden shadow-sm animate-pulse">
              <div className="aspect-[2.5/3.5] bg-[var(--bg-card-hover)]" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-[var(--bg-card-hover)] rounded w-3/4" />
                <div className="h-3 bg-[var(--bg-card-hover)] rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <CardGrid
          cards={cards}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title={`Delete ${selectedIds.size} card${selectedIds.size === 1 ? "" : "s"}?`}
        message={`The selected card${selectedIds.size === 1 ? "" : "s"} and all associated images will be permanently removed. This can't be undone.`}
        confirmLabel={`Delete ${selectedIds.size}`}
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense>
      <InventoryContent />
    </Suspense>
  );
}
