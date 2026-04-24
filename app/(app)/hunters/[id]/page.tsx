"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import { useToast } from "@/app/components/ui/Toast";

interface SearchResult {
  id: string;
  marketplace: string;
  listing_url: string;
  title: string;
  price_cents: number;
  image_url: string | null;
  seller_name: string | null;
  is_read: boolean;
  found_at: string;
}

interface CardSearch {
  id: string;
  name: string;
  filters: Record<string, string | number | boolean>;
  is_active: boolean;
  result_count: number;
  last_run_at: string | null;
  target_card_numbers?: string[] | null;
}

const MP_LABELS: Record<string, string> = { ebay: "eBay", tiktok: "TikTok Shop" };

export default function SearchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState<CardSearch | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/hunters/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSearch(data.search || null);
        setResults(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleRun = async () => {
    setRunning(true);
    setConfigError(null);
    try {
      const res = await fetch(`/api/hunters/${id}/run`, { method: "POST" });
      const data = await res.json();

      if (data.error === "marketplace_not_configured") {
        setConfigError(data.message);
        setRunning(false);
        return;
      }

      if (!res.ok) {
        toast.error(data.error || data.message || "Search failed. Try again.");
        setRunning(false);
        return;
      }

      // Per-marketplace failures (search ran but some marketplaces errored)
      if (Array.isArray(data.errors) && data.errors.length > 0) {
        const failedMps = data.errors
          .map((e: { marketplace: string }) => e.marketplace)
          .join(", ");
        toast.error(
          `${failedMps} search failed: ${data.errors[0].message || "see server logs"}`
        );
      }

      // Surface success info
      if (data.newResults > 0) {
        toast.success(`Found ${data.newResults} new match${data.newResults > 1 ? "es" : ""}.`);
      } else if (!data.errors?.length) {
        toast.info("Search ran — no new matches yet.");
      }

      // Refresh results
      const detail = await fetch(`/api/hunters/${id}`).then((r) => r.json());
      setSearch(detail.search);
      setResults(detail.results || []);
    } catch {
      toast.error("Couldn't reach the server. Try again.");
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await fetch(`/api/hunters/${id}`, { method: "DELETE" });
    router.push("/hunters");
  };

  const markAllRead = async () => {
    await fetch(`/api/hunters/${id}/results`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mark_all_read: true }),
    });
    setResults((prev) => prev.map((r) => ({ ...r, is_read: true })));
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-[var(--bg-card-hover)] rounded w-64" />
        <div className="h-20 bg-[var(--bg-card-hover)] rounded-xl" />
      </div>
    );
  }

  if (!search) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Search not found.</p>
        <Link href="/hunters" className="text-[var(--green)] text-sm mt-2 inline-block">
          Back to searches
        </Link>
      </div>
    );
  }

  const unreadCount = results.filter((r) => !r.is_read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Card Hunter", href: "/hunters" }, { label: search.name }]} />
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{search.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRun}
              disabled={running}
              className="px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
            >
              {running ? "Searching..." : "Run Now"}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {configError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">{configError}</p>
          <a href="/settings" className="text-sm text-[var(--green)] font-medium mt-1 inline-block">Go to Settings</a>
        </div>
      )}

      {/* Card-number whitelist badge — shows when this hunter targets specific cards */}
      {search.target_card_numbers && search.target_card_numbers.length > 0 && (
        <div className="bg-[var(--bg-green-glow)] border border-[var(--green)]/30 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-[var(--green)] mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="text-xs">
            <p className="font-semibold text-[var(--text-primary)]">
              Filtering to {search.target_card_numbers.length} specific card numbers
            </p>
            <p className="text-[var(--text-secondary)] mt-0.5">
              Only listings whose titles mention these card #s will be saved as results.{" "}
              <span className="text-[var(--text-muted)]">
                e.g. {search.target_card_numbers.slice(0, 6).map((n) => `#${n}`).join(", ")}
                {search.target_card_numbers.length > 6 && "…"}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {results.length} result{results.length !== 1 ? "s" : ""}
          {unreadCount > 0 && ` (${unreadCount} new)`}
        </p>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-[var(--green)] font-medium cursor-pointer"
          >
            Mark all read
          </button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-8 text-center shadow-sm">
          <p className="text-[var(--text-muted)]">
            No matches found yet. Click &ldquo;Run Now&rdquo; to search marketplaces.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => (
            <a
              key={result.id}
              href={result.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-4 bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm hover:shadow-md transition-shadow ${
                !result.is_read ? "ring-2 ring-[var(--bg-green-glow)]" : ""
              }`}
            >
              {result.image_url ? (
                <img
                  src={result.image_url}
                  alt=""
                  className="w-16 h-20 object-cover rounded"
                />
              ) : (
                <div className="w-16 h-20 bg-[var(--bg-card-hover)] rounded flex items-center justify-center text-[var(--text-muted)]">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {result.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--text-muted)]">
                    {MP_LABELS[result.marketplace] || result.marketplace}
                  </span>
                  {result.seller_name && (
                    <span className="text-xs text-[var(--text-muted)]">
                      by {result.seller_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-[var(--text-primary)]">
                  {formatCurrency(result.price_cents)}
                </p>
                {!result.is_read && (
                  <span className="inline-block w-2 h-2 bg-[var(--bg-green-glow)]0 rounded-full mt-1" />
                )}
              </div>
            </a>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete search?"
        message={`"${search?.name}" and all its results will be permanently removed. You'll stop receiving alerts for matching cards.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
