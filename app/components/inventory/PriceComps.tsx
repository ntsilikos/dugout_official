"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface Comp {
  title: string;
  price_cents: number;
  condition: string;
  image_url: string | null;
  listing_url: string;
}

interface MatchInfo {
  description: string;
  player: string;
  set: string;
  number: string;
  variant: string;
  confidence: number;
  image: string;
}

interface ImageMatch {
  card_id: string;
  description: string;
  image: string;
  similarity: number;
}

interface ImageCandidate {
  card_id: string;
  description: string;
  image: string;
  similarity: number;
  number?: string;
  variant?: string;
  set?: string;
}

interface CompData {
  comps: Comp[];
  average_cents: number;
  median_cents: number;
  low_cents: number;
  high_cents: number;
  count: number;
  configured?: boolean;
  matchedTo?: MatchInfo | null;
  userImageUrl?: string | null;
  imageMatch?: ImageMatch | null;
  imageCandidates?: ImageCandidate[];
  matchAgreement?: "both-agree" | "text-only" | "image-differs" | "none";
  cardhedge_card_id?: string;
}

interface PriceCompsProps {
  cardId: string;
}

export default function PriceComps({ cardId }: PriceCompsProps) {
  const [data, setData] = useState<CompData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [pickingCandidate, setPickingCandidate] = useState<string | null>(null);

  const fetchComps = async () => {
    setLoading(true);
    const res = await fetch(`/api/cards/${cardId}/comps`);
    const result = await res.json();
    setData(result);
    setLoading(false);
  };

  const pickCandidate = async (candidate: ImageCandidate) => {
    setPickingCandidate(candidate.card_id);
    await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardhedge_card_id: candidate.card_id }),
    });
    await fetchComps();
    setShowCandidates(false);
    setPickingCandidate(null);
  };

  if (!data && !loading) {
    return (
      <button
        onClick={fetchComps}
        className="w-full py-2.5 border border-[var(--green)/30] text-[var(--green)] rounded-lg text-sm font-medium hover:bg-[var(--bg-green-glow)] transition-colors cursor-pointer"
      >
        Check Market Price
      </button>
    );
  }

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm animate-pulse">
        <div className="h-5 bg-[var(--bg-card-hover)] rounded w-32 mb-3" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-[var(--bg-card-hover)] rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.count === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
        {data?.configured === false ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No pricing API configured.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">No comparable sales found.</p>
            <button
              onClick={fetchComps}
              className="text-xs text-[var(--green)] font-medium mt-1 cursor-pointer"
            >
              Try again
            </button>
          </>
        )}
      </div>
    );
  }

  const match = data.matchedTo;
  const agreement = data.matchAgreement;
  const mismatch = agreement === "image-differs";
  const candidates = data.imageCandidates || [];
  const hasCandidates = candidates.length > 0 && !!data.userImageUrl;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Market Comps</h3>
          <span className="text-xs text-[var(--text-muted)]">{data.count} comps</span>
        </div>

        {/* Side-by-side visual comparison */}
        {match && data.userImageUrl && !showCandidates && (
          <div className="mb-3">
            <div
              className={`grid grid-cols-2 gap-2 p-3 rounded-lg ${
                mismatch
                  ? "bg-red-950/30 border border-red-500/30"
                  : agreement === "both-agree"
                    ? "bg-green-950/30 border border-green-500/30"
                    : "bg-[var(--bg-primary)] border border-[var(--border)]"
              }`}
            >
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 font-semibold">
                  Your Card
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.userImageUrl}
                  alt="Your card"
                  className="w-full aspect-[2.5/3.5] object-contain bg-black/20 rounded"
                />
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1.5 font-semibold">
                  Matched To
                </p>
                {match.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={match.image.startsWith("//") ? `https:${match.image}` : match.image}
                    alt=""
                    className="w-full aspect-[2.5/3.5] object-contain bg-black/20 rounded"
                  />
                )}
              </div>
            </div>

            <div className="mt-2 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {match.description}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  #{match.number} {match.variant !== "Base" ? `· ${match.variant}` : ""}
                </p>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                  agreement === "both-agree"
                    ? "bg-green-900/40 text-green-400"
                    : mismatch
                      ? "bg-red-900/40 text-red-400"
                      : match.confidence >= 0.9
                        ? "bg-yellow-900/40 text-yellow-400"
                        : "bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
                }`}
              >
                {agreement === "both-agree"
                  ? "✓ Visual Match"
                  : mismatch
                    ? "⚠ Visual Mismatch"
                    : `${Math.round(match.confidence * 100)}% text match`}
              </span>
            </div>

            {/* "Not the right card?" action — always visible so user can always refine */}
            <button
              onClick={() => setShowCandidates(true)}
              className="w-full mt-2 px-3 py-1.5 border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--green)] hover:text-[var(--green)] rounded-md text-xs font-medium cursor-pointer transition-colors"
            >
              {mismatch
                ? "⚠ This doesn't look right — Pick the correct card"
                : "Not the right card? Choose from visual matches"}
            </button>
          </div>
        )}

        {/* When there's NO text match but we DO have image candidates,
            show a standalone picker prompt so user can still pick the right card */}
        {!match && hasCandidates && !showCandidates && (
          <div className="mb-3 p-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg">
            <div className="flex items-center gap-3">
              {data.userImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.userImageUrl}
                  alt=""
                  className="w-12 h-16 object-contain bg-black/20 rounded shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  No authoritative match found
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Prices below are from eBay search. Pick your exact card for accurate pricing.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCandidates(true)}
              className="w-full mt-2 px-3 py-1.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-md text-xs font-semibold cursor-pointer hover:bg-[var(--green-hover)]"
            >
              Pick your card from {candidates.length} visual matches
            </button>
          </div>
        )}

        {/* Candidate picker — grid of image-search results */}
        {showCandidates && data.userImageUrl && (
          <div className="mb-3 bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Which card is yours?
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  Picking the right one gives you accurate pricing for this exact variant.
                </p>
              </div>
              <button
                onClick={() => setShowCandidates(false)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {/* User's card on top for reference */}
            <div className="mb-3 flex items-center gap-3 p-2 bg-[var(--bg-card)] rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={data.userImageUrl}
                alt=""
                className="w-12 h-16 object-contain bg-black/20 rounded"
              />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                  Your card (reference)
                </p>
              </div>
            </div>

            {candidates.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] text-center py-4">
                No visual matches found. Try a clearer photo or check metadata manually.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {candidates.map((c) => {
                  const isCurrent = c.card_id === data.cardhedge_card_id;
                  const isPicking = pickingCandidate === c.card_id;
                  return (
                    <button
                      key={c.card_id}
                      onClick={() => pickCandidate(c)}
                      disabled={isPicking || isCurrent}
                      className={`relative text-left bg-[var(--bg-card)] rounded-lg p-2 border transition-all ${
                        isCurrent
                          ? "border-[var(--green)] bg-[var(--bg-green-glow)]"
                          : "border-[var(--border)] hover:border-[var(--green)] hover:-translate-y-px cursor-pointer"
                      } ${isPicking ? "opacity-50" : ""}`}
                    >
                      {isCurrent && (
                        <span className="absolute top-1 right-1 bg-[var(--green)] text-[var(--bg-primary)] text-[9px] font-bold px-1.5 py-0.5 rounded-full z-10">
                          CURRENT
                        </span>
                      )}
                      {c.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.image}
                          alt=""
                          className="w-full aspect-[2.5/3.5] object-contain bg-black/20 rounded mb-1.5"
                        />
                      )}
                      <p className="text-[10px] font-medium text-[var(--text-primary)] line-clamp-2 leading-tight">
                        {c.description}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[9px] text-[var(--text-muted)]">
                          {c.number && `#${c.number}`}
                          {c.variant && c.variant !== "Base" && ` · ${c.variant}`}
                        </span>
                        <span className="text-[9px] font-semibold text-[var(--green)]">
                          {Math.round(c.similarity * 100)}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-[var(--text-muted)] text-center mt-3">
              Click the card that matches yours. Prices will refresh with the correct data.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-2 bg-[var(--bg-primary)] rounded-lg">
            <p className="text-xs text-[var(--text-muted)]">Estimate</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(data.average_cents)}</p>
          </div>
          <div className="text-center p-2 bg-[var(--bg-primary)] rounded-lg">
            <p className="text-xs text-[var(--text-muted)]">Comp Avg</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">{formatCurrency(data.median_cents)}</p>
          </div>
          <div className="text-center p-2 bg-[var(--bg-primary)] rounded-lg">
            <p className="text-xs text-[var(--text-muted)]">Low</p>
            <p className="text-lg font-bold text-[var(--green)]">{formatCurrency(data.low_cents)}</p>
          </div>
          <div className="text-center p-2 bg-[var(--bg-primary)] rounded-lg">
            <p className="text-xs text-[var(--text-muted)]">High</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(data.high_cents)}</p>
          </div>
        </div>
      </div>

      {data.comps.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-2 text-xs text-[var(--green)] font-medium border-t border-[var(--border)] hover:bg-[var(--bg-primary)] cursor-pointer"
          >
            {expanded ? "Hide listings" : `Show ${data.comps.length} listings`}
          </button>

          {expanded && (
            <div className="border-t border-[var(--border)]">
              <div className="px-4 py-2 bg-[var(--bg-primary)] border-b border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  Review each listing — eBay search can include similar cards. Click a row to verify on eBay.
                </p>
              </div>
              {data.comps.map((comp, i) => {
                const isLink = comp.listing_url && comp.listing_url.length > 0;
                const Row = isLink ? "a" : "div";
                return (
                  <Row
                    key={i}
                    {...(isLink
                      ? {
                          href: comp.listing_url,
                          target: "_blank",
                          rel: "noopener noreferrer",
                        }
                      : {})}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-primary)] border-b border-[var(--border)] last:border-b-0 block"
                  >
                    {comp.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comp.image_url}
                        alt=""
                        className="w-10 h-14 object-contain bg-white rounded shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 bg-[var(--bg-card-hover)] rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {comp.title && (
                        <p className="text-xs text-[var(--text-primary)] line-clamp-2 leading-tight">
                          {comp.title}
                        </p>
                      )}
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {comp.condition}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] shrink-0">
                      {formatCurrency(comp.price_cents)}
                    </span>
                  </Row>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
