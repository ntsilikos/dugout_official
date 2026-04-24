"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/app/components/ui/Toast";

interface Comp {
  title: string;
  price_cents: number;
  condition: string;
  image_url: string | null;
  listing_url: string;
  is_sold?: boolean;
  visual_confidence?: number;
  visual_reason?: string;
}

interface TopVisualMatch {
  title: string;
  image_url: string | null;
  listing_url: string;
  confidence: number;
  reason: string;
}

interface CompData {
  comps: Comp[];
  average_cents: number;
  median_cents: number;
  low_cents: number;
  high_cents: number;
  count: number;
  source?: "ebay" | "cardhedge";
  configured?: boolean;
  userImageUrl?: string | null;
  visualFilterApplied?: boolean;
  visualFilterReason?: string | null;
  comparedCount?: number;
  acceptedCount?: number | null;
  topVisualMatch?: TopVisualMatch | null;
}

interface PriceCompsProps {
  cardId: string;
  onValueUpdated?: (newValueCents: number) => void;
}

function getFilterMessage(data: CompData): string | null {
  if (data.visualFilterApplied) {
    if ((data.acceptedCount || 0) > 0 && (data.comparedCount || 0) > 0) {
      return `Matched ${data.acceptedCount} of ${data.comparedCount} eBay listings by image.`;
    }
    if ((data.comparedCount || 0) > 0) {
      return `Compared ${data.comparedCount} eBay listing photos and found no exact visual matches.`;
    }
    return "No eBay listing photos were usable for visual comparison.";
  }

  if (data.visualFilterReason === "missing_user_image") {
    return "No front image is attached to this card, so these prices are title-filtered eBay results only.";
  }
  if (data.visualFilterReason === "anthropic_not_configured") {
    return "Visual comparison is unavailable, so these prices are title-filtered eBay results only.";
  }
  if (data.visualFilterReason === "visual_compare_failed") {
    return "Visual comparison failed for this request, so these prices are title-filtered eBay results only.";
  }

  return null;
}

export default function PriceComps({ cardId, onValueUpdated }: PriceCompsProps) {
  const toast = useToast();
  const [data, setData] = useState<CompData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // Which price-source key (e.g., "avg", "estimate", "listing-3") is currently
  // being saved. Prevents double-clicks and lights up the chosen control.
  const [saving, setSaving] = useState<string | null>(null);
  // Remember the last picked value so we can dim/check the right chip after success
  const [pickedValueCents, setPickedValueCents] = useState<number | null>(null);

  const fetchComps = async () => {
    setLoading(true);
    const res = await fetch(`/api/cards/${cardId}/comps`);
    const result = await res.json();
    setData(result);
    setLoading(false);
  };

  const setCardValue = async (valueCents: number, sourceKey: string, label: string) => {
    if (saving) return;
    setSaving(sourceKey);
    try {
      const res = await fetch(`/api/cards/${cardId}/set-value`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ valueCents, source: label }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Couldn't update card value");
        return;
      }
      setPickedValueCents(valueCents);
      toast.success(`Card value set to ${formatCurrency(valueCents)} (${label})`);
      onValueUpdated?.(valueCents);
    } catch {
      toast.error("Couldn't update card value");
    } finally {
      setSaving(null);
    }
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

  const filterMessage = data ? getFilterMessage(data) : null;

  if (!data || data.count === 0) {
    return (
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
        {data?.configured === false ? (
          <p className="text-sm text-[var(--text-secondary)]">
            eBay pricing is not configured.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)]">
              {(data?.visualFilterApplied && (data?.comparedCount || 0) > 0)
                ? "No visually matching eBay listings found."
                : "No comparable sales found."}
            </p>
            {filterMessage && (
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{filterMessage}</p>
            )}
            <button
              onClick={fetchComps}
              className="text-xs text-[var(--green)] font-medium mt-2 cursor-pointer"
            >
              Try again
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Market Comps</h3>
          <span className="text-xs text-[var(--text-muted)]">
            {data.source === "cardhedge" ? "CardHedge" : "eBay"} · {data.count} comps
          </span>
        </div>

        {/* Source banner — clarify whether prices are based on sold data or active listings */}
        {data.source === "cardhedge" ? (
          <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--bg-green-glow)] border border-[var(--green)]/30 flex items-start gap-2">
            <span className="bg-[var(--green)] text-[var(--bg-primary)] px-1.5 py-0.5 rounded font-bold text-[9px] tracking-wider mt-0.5">
              SOLD
            </span>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Prices below are aggregated from <strong className="text-[var(--text-primary)]">recent real sales</strong> via
              CardHedge — not asking prices.
            </p>
          </div>
        ) : (
          <div className="mb-3 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <p className="text-[11px] text-[var(--text-muted)]">
              Prices below are mostly <strong className="text-[var(--text-secondary)]">active eBay listings</strong> (asking
              prices). Listings tagged <span className="bg-[var(--green)] text-[var(--bg-primary)] px-1 py-0.5 rounded font-bold text-[8px] tracking-wider mx-0.5">SOLD</span>
              {" "}are real recent sales.
            </p>
          </div>
        )}

        {data.userImageUrl && data.topVisualMatch?.image_url && (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
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
                  Closest eBay Match
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.topVisualMatch.image_url}
                  alt=""
                  className="w-full aspect-[2.5/3.5] object-contain bg-black/20 rounded"
                />
              </div>
            </div>

            <div className="mt-2 flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text-primary)] line-clamp-2">
                  {data.topVisualMatch.title}
                </p>
                {data.topVisualMatch.reason && (
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {data.topVisualMatch.reason}
                  </p>
                )}
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap bg-green-900/40 text-green-400">
                {Math.round(data.topVisualMatch.confidence * 100)}% visual match
              </span>
            </div>
          </div>
        )}

        {filterMessage && (
          <div className="mb-3 p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
            <p className="text-[11px] text-[var(--text-muted)]">{filterMessage}</p>
          </div>
        )}

        {/* Summary stat picker — each box is a clickable button that sets the
            card's estimated value. The label below each price describes what
            it is ("use average", "use low", etc) and swaps to a checkmark
            after it's been picked. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryStat
            label="Estimate"
            valueCents={data.average_cents}
            colorClass="text-[var(--text-primary)]"
            sourceKey="estimate"
            sourceLabel="Estimate"
            onPick={setCardValue}
            saving={saving}
            pickedValueCents={pickedValueCents}
          />
          <SummaryStat
            label="Comp Avg"
            valueCents={data.median_cents}
            colorClass="text-[var(--text-primary)]"
            sourceKey="median"
            sourceLabel="Comp Avg"
            onPick={setCardValue}
            saving={saving}
            pickedValueCents={pickedValueCents}
          />
          <SummaryStat
            label="Low"
            valueCents={data.low_cents}
            colorClass="text-[var(--green)]"
            sourceKey="low"
            sourceLabel="Low comp"
            onPick={setCardValue}
            saving={saving}
            pickedValueCents={pickedValueCents}
          />
          <SummaryStat
            label="High"
            valueCents={data.high_cents}
            colorClass="text-red-500"
            sourceKey="high"
            sourceLabel="High comp"
            onPick={setCardValue}
            saving={saving}
            pickedValueCents={pickedValueCents}
          />
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
          Click any price above — or a listing below — to set it as this card&apos;s value.
        </p>
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
                  These listings passed the eBay title filter and the visual comparison against your card.
                </p>
              </div>
              {data.comps.map((comp, i) => {
                const sourceKey = `listing-${i}`;
                const isPicked =
                  pickedValueCents !== null &&
                  pickedValueCents === comp.price_cents &&
                  saving !== sourceKey;
                const isBusy = saving === sourceKey;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-primary)] transition-colors"
                  >
                    {/* Left half: image + title link out to eBay */}
                    {comp.listing_url ? (
                      <a
                        href={comp.listing_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 flex-1 min-w-0 group"
                      >
                        <ListingThumb imageUrl={comp.image_url} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-primary)] line-clamp-2 leading-tight group-hover:text-[var(--green)] transition-colors">
                            {comp.title}
                          </p>
                          <ListingMeta comp={comp} />
                        </div>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ListingThumb imageUrl={comp.image_url} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-[var(--text-primary)] line-clamp-2 leading-tight">
                            {comp.title}
                          </p>
                          <ListingMeta comp={comp} />
                        </div>
                      </div>
                    )}

                    {/* Right side: price + Use button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">
                        {formatCurrency(comp.price_cents)}
                      </span>
                      <button
                        onClick={() =>
                          setCardValue(comp.price_cents, sourceKey, "Listing price")
                        }
                        disabled={isBusy || !!saving}
                        title="Set this as the card's value"
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                          isPicked
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : isBusy
                              ? "bg-[var(--bg-card-hover)] text-[var(--text-muted)] cursor-wait"
                              : "bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/40 hover:bg-[var(--green)]/20"
                        }`}
                      >
                        {isPicked ? (
                          <>
                            <CheckIcon />
                            Used
                          </>
                        ) : isBusy ? (
                          "…"
                        ) : (
                          "Use"
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  valueCents,
  colorClass,
  sourceKey,
  sourceLabel,
  onPick,
  saving,
  pickedValueCents,
}: {
  label: string;
  valueCents: number;
  colorClass: string;
  sourceKey: string;
  sourceLabel: string;
  onPick: (cents: number, key: string, label: string) => void;
  saving: string | null;
  pickedValueCents: number | null;
}) {
  const isPicked =
    pickedValueCents !== null && pickedValueCents === valueCents && saving !== sourceKey;
  const isBusy = saving === sourceKey;
  const busyElsewhere = saving !== null && saving !== sourceKey;

  return (
    <button
      onClick={() => onPick(valueCents, sourceKey, sourceLabel)}
      disabled={isBusy || busyElsewhere}
      className={`text-center p-2 rounded-lg transition-all cursor-pointer relative ${
        isPicked
          ? "bg-emerald-500/10 border border-emerald-500/40"
          : isBusy
            ? "bg-[var(--bg-card-hover)] border border-[var(--border)] cursor-wait"
            : "bg-[var(--bg-primary)] border border-transparent hover:border-[var(--green)]/40 hover:bg-[var(--bg-card-hover)]"
      }`}
      title={`Set card value to ${formatCurrency(valueCents)}`}
    >
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className={`text-lg font-bold ${colorClass}`}>{formatCurrency(valueCents)}</p>
      <p
        className={`text-[9px] uppercase tracking-wider mt-0.5 font-semibold ${
          isPicked ? "text-emerald-400" : "text-[var(--green)]"
        }`}
      >
        {isPicked ? "✓ Used" : isBusy ? "Saving…" : "Use this"}
      </p>
    </button>
  );
}

function ListingThumb({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        className="w-10 h-14 object-contain bg-white rounded shrink-0"
      />
    );
  }
  return <div className="w-10 h-14 bg-[var(--bg-card-hover)] rounded shrink-0" />;
}

function ListingMeta({ comp }: { comp: Comp }) {
  return (
    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1.5">
      {comp.is_sold ? (
        <span className="bg-[var(--green)] text-[var(--bg-primary)] px-1.5 py-0.5 rounded font-bold text-[9px] tracking-wider">
          SOLD
        </span>
      ) : null}
      <span>{comp.condition}</span>
      {typeof comp.visual_confidence === "number" && (
        <span>· {Math.round(comp.visual_confidence * 100)}% visual match</span>
      )}
    </p>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
