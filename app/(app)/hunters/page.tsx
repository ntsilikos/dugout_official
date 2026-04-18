"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import ConfirmModal from "@/app/components/ui/ConfirmModal";

interface CardSearch {
  id: string;
  name: string;
  filters: Record<string, string | number | boolean>;
  is_active: boolean;
  result_count: number;
  last_run_at: string | null;
  created_at: string;
}

export default function HuntersPage() {
  const [searches, setSearches] = useState<CardSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CardSearch | null>(null);

  useEffect(() => {
    fetch("/api/hunters")
      .then((res) => res.json())
      .then((data) => {
        setSearches(data.searches || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/hunters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_active: !isActive } : s))
    );
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    await fetch(`/api/hunters/${id}`, { method: "DELETE" });
    setSearches((prev) => prev.filter((s) => s.id !== id));
  };

  const getFilterSummary = (filters: Record<string, string | number | boolean>) => {
    return Object.entries(filters)
      .filter(([, v]) => v !== "" && v !== false && v != null)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">CARD HUNTER</h1>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 animate-pulse">
              <div className="h-5 bg-[var(--bg-card-hover)] rounded w-48 mb-2" />
              <div className="h-4 bg-[var(--bg-card-hover)] rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">CARD HUNTER</h1>
        <Link
          href="/hunters/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Search
        </Link>
      </div>

      {searches.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Find the cards you want</h2>
          <p className="text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
            Set up searches and get notified when cards matching your criteria appear on connected marketplaces.
          </p>
          <Link
            href="/hunters/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] transition-colors"
          >
            Create Your First Search
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((search) => (
            <div
              key={search.id}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <Link href={`/hunters/${search.id}`} className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-[var(--text-primary)] hover:text-[var(--green)] transition-colors">
                      {search.name}
                    </h3>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        search.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
                      }`}
                    >
                      {search.is_active ? "Active" : "Paused"}
                    </span>
                    {search.result_count > 0 && (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--bg-green-glow)] text-[var(--green)]">
                        {search.result_count} results
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {getFilterSummary(search.filters)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {search.last_run_at
                      ? `Last run: ${formatDate(search.last_run_at)}`
                      : "Never run"}
                  </p>
                </Link>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleActive(search.id, search.is_active)}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-medium cursor-pointer"
                  >
                    {search.is_active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(search)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete search?"
        message={`"${deleteTarget?.name}" will be permanently removed. You'll stop receiving alerts for matching cards.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
