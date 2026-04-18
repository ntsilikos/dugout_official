"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Listing {
  id: string;
  marketplace: string;
  marketplace_url: string | null;
  status: string;
  title: string;
  price_cents: number;
  listed_at: string | null;
  sold_at: string | null;
  error_message: string | null;
  cards?: {
    player_name: string | null;
    sport: string | null;
  };
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  draft: "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]",
  error: "bg-red-100 text-red-700",
  cancelled: "bg-yellow-100 text-yellow-700",
  pending: "bg-orange-100 text-orange-700",
};

const MARKETPLACE_LABELS: Record<string, string> = {
  ebay: "eBay",
  tiktok: "TikTok Shop",
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const params = filter ? `?status=${filter}` : "";
    fetch(`/api/listings${params}`)
      .then((res) => res.json())
      .then((data) => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [filter]);

  const handleSync = async () => {
    await fetch("/api/listings/sync", { method: "POST" });
    // Refresh listings
    const res = await fetch(`/api/listings${filter ? `?status=${filter}` : ""}`);
    const data = await res.json();
    setListings(data.listings || []);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">LISTINGS</h1>
        <button
          onClick={handleSync}
          className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)] transition-colors cursor-pointer"
        >
          Sync Status
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["", "active", "sold", "error", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              filter === status
                ? "bg-[var(--bg-green-glow)] text-[var(--green)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]"
            }`}
          >
            {status || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 animate-pulse">
              <div className="h-5 bg-[var(--bg-card-hover)] rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <p className="text-[var(--text-muted)] mb-2">No listings yet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Go to a card in your inventory and click &ldquo;List on Marketplace&rdquo;
          </p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Title</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Marketplace</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Price</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {listings.map((listing) => (
                <tr key={listing.id} className="hover:bg-[var(--bg-primary)]">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-xs">
                      {listing.title}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {MARKETPLACE_LABELS[listing.marketplace] || listing.marketplace}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {formatCurrency(listing.price_cents)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        STATUS_STYLES[listing.status] || STATUS_STYLES.draft
                      }`}
                    >
                      {listing.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {listing.listed_at
                      ? formatDate(listing.listed_at)
                      : formatDate(listing.sold_at || "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
