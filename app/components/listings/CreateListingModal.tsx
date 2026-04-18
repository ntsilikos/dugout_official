"use client";

import { useState, useEffect } from "react";

interface CreateListingModalProps {
  cardId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Connection {
  marketplace: string;
  marketplace_username: string | null;
  is_active: boolean;
}

export default function CreateListingModal({
  cardId,
  isOpen,
  onClose,
  onSuccess,
}: CreateListingModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedMarketplaces, setSelectedMarketplaces] = useState<string[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [priceAdvice, setPriceAdvice] = useState<{
    recommended_price_cents: number;
    quick_sale_price_cents: number;
    patient_price_cents: number;
    confidence: string;
    reasoning: string;
    market_trend: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    // Fetch connections
    fetch("/api/marketplace/connections")
      .then((res) => res.json())
      .then((data) => setConnections(data.connections || []))
      .catch(() => {});
  }, [isOpen]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/listings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_id: cardId }),
      });
      const data = await res.json();
      if (data.title) setTitle(data.title);
      if (data.description) setDescription(data.description);
    } catch {
      setError("Failed to generate listing content");
    } finally {
      setGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMarketplaces.length || !title || !price) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: cardId,
          marketplaces: selectedMarketplaces,
          title,
          description,
          price_cents: Math.round(parseFloat(price) * 100),
          ai_generated_title: title,
          ai_generated_description: description,
        }),
      });

      const data = await res.json();
      if (data.results?.some((r: { success?: boolean }) => r.success)) {
        onSuccess();
      } else {
        setError(data.results?.[0]?.error || "Failed to create listing");
      }
    } catch {
      setError("Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMarketplace = (mp: string) => {
    setSelectedMarketplaces((prev) =>
      prev.includes(mp) ? prev.filter((m) => m !== mp) : [...prev, mp]
    );
  };

  if (!isOpen) return null;

  const activeConnections = connections.filter((c) => c.is_active);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              List on Marketplace
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* AI Generate */}
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-2 border border-[var(--green)/30] text-[var(--green)] rounded-lg text-sm font-medium hover:bg-[var(--bg-green-glow)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {generating ? "Generating with AI..." : "Generate Title & Description with AI"}
          </button>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="e.g. 2024 Topps Chrome Mike Trout #150 PSA 10"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">{title.length}/80</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none resize-none"
              placeholder="Card description..."
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="0.00"
            />
            <button
              type="button"
              onClick={async () => {
                setFetchingPrice(true);
                try {
                  const res = await fetch(`/api/cards/${cardId}/price-advice`);
                  const data = await res.json();
                  if (data.advice) setPriceAdvice(data.advice);
                } catch { /* ignore */ }
                setFetchingPrice(false);
              }}
              disabled={fetchingPrice}
              className="mt-2 w-full py-1.5 border border-green-200 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 disabled:opacity-50 cursor-pointer"
            >
              {fetchingPrice ? "Analyzing market..." : "AI Suggest Price"}
            </button>
            {priceAdvice && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-2">
                  {[
                    { label: "Quick Sale", cents: priceAdvice.quick_sale_price_cents, color: "border-green-300 text-green-700" },
                    { label: "Recommended", cents: priceAdvice.recommended_price_cents, color: "border-[var(--green)/30] text-[var(--green)] bg-[var(--bg-green-glow)]" },
                    { label: "Patient", cents: priceAdvice.patient_price_cents, color: "border-amber-300 text-amber-700" },
                  ].map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => setPrice((opt.cents / 100).toFixed(2))}
                      className={`flex-1 py-2 border rounded-lg text-xs font-medium cursor-pointer ${opt.color}`}
                    >
                      <div>{opt.label}</div>
                      <div className="font-bold">${(opt.cents / 100).toFixed(2)}</div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--text-muted)]">{priceAdvice.reasoning}</p>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                  priceAdvice.market_trend === "rising" ? "bg-green-100 text-green-700" :
                  priceAdvice.market_trend === "declining" ? "bg-red-100 text-red-700" :
                  "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                }`}>
                  Market: {priceAdvice.market_trend}
                </span>
              </div>
            )}
          </div>

          {/* Marketplaces */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Marketplaces
            </label>
            {activeConnections.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No marketplaces connected.{" "}
                <a href="/settings" className="text-[var(--green)] hover:underline">
                  Connect one in Settings
                </a>
              </p>
            ) : (
              <div className="space-y-2">
                {activeConnections.map((conn) => (
                  <label
                    key={conn.marketplace}
                    className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg cursor-pointer hover:bg-[var(--bg-card-hover)]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMarketplaces.includes(conn.marketplace)}
                      onChange={() => toggleMarketplace(conn.marketplace)}
                      className="w-4 h-4 text-[var(--green)] rounded"
                    />
                    <span className="text-sm font-medium text-[var(--text-secondary)] capitalize">
                      {conn.marketplace}
                    </span>
                    {conn.marketplace_username && (
                      <span className="text-xs text-[var(--text-muted)]">
                        ({conn.marketplace_username})
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg font-medium hover:bg-[var(--bg-primary)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !selectedMarketplaces.length ||
                !title ||
                !price
              }
              className="flex-1 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Listing..." : "List Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
