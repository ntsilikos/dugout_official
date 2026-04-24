"use client";

import { useState } from "react";
import type { ScanResult } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import DualImageUpload, { type ImageData } from "@/app/components/DualImageUpload";
import GradeBadge from "@/app/components/GradeBadge";
import GradeBreakdown from "@/app/components/GradeBreakdown";

interface EbayComp {
  title: string;
  price_cents: number;
  image_url: string | null;
  listing_url: string;
}

interface ScanCardProps {
  onScanComplete: (
    result: ScanResult,
    imageData: { base64: string; mediaType: string },
    backImage?: { base64: string; mediaType: string }
  ) => void;
}

const INITIAL_COMP_COUNT = 6;

export default function ScanCard({ onScanComplete }: ScanCardProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [frontImage, setFrontImage] = useState<ImageData | null>(null);
  const [backImage, setBackImage] = useState<ImageData | null>(null);
  const [ebayComps, setEbayComps] = useState<EbayComp[]>([]);
  const [showAllComps, setShowAllComps] = useState(false);
  const [parsingIndex, setParsingIndex] = useState<number | null>(null);
  const [overriddenFromIndex, setOverriddenFromIndex] = useState<number | null>(null);

  const handleImagesReady = (front: ImageData, back: ImageData | null) => {
    setFrontImage(front);
    setBackImage(back);
  };

  const handleScan = async () => {
    if (!frontImage) return;
    setScanning(true);
    setError(null);
    setResult(null);
    setEbayComps([]);
    setShowAllComps(false);
    setOverriddenFromIndex(null);

    try {
      const response = await fetch("/api/cards/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: frontImage.base64,
          mediaType: frontImage.mediaType,
          backImage: backImage?.base64,
          backMediaType: backImage?.mediaType,
        }),
      });

      const json = await response.json();

      if (json.success && json.result) {
        setResult(json.result);
        if (json.ebayComps?.length) {
          setEbayComps(json.ebayComps);
        }
      } else {
        setError(json.error || "Failed to scan card");
      }
    } catch {
      setError("Failed to connect to scanning service. Please try again.");
    } finally {
      setScanning(false);
    }
  };

  // Use the info parsed from an eBay listing title to override scan fields
  const handleUseListingInfo = async (comp: EbayComp, index: number) => {
    if (!result) return;
    setParsingIndex(index);
    try {
      const res = await fetch("/api/cards/parse-ebay-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: comp.title }),
      });
      const data = await res.json();
      if (data.parsed) {
        const p = data.parsed as Partial<ScanResult>;
        setResult({
          ...result,
          // Only override fields that the parser confidently filled
          playerName: p.playerName ?? result.playerName,
          year: p.year ?? result.year,
          brand: p.brand ?? result.brand,
          setName: p.setName ?? result.setName,
          cardNumber: p.cardNumber ?? result.cardNumber,
          variant: p.variant ?? result.variant,
          sport: p.sport ?? result.sport,
          // Use the listing's price as new estimate
          estimatedValueCents: comp.price_cents,
          // Optional flags
          isAutograph: p.isAutograph ?? result.isAutograph,
          isPatch: p.isPatch ?? result.isPatch,
          isRookie: p.isRookie ?? result.isRookie,
          // Update the description so it reflects the chosen card
          cardIdentification: comp.title,
        });
        setOverriddenFromIndex(index);
      }
    } catch {
      // ignore — user can try another listing
    } finally {
      setParsingIndex(null);
    }
  };

  const visibleComps = showAllComps ? ebayComps : ebayComps.slice(0, INITIAL_COMP_COUNT);
  const hasMore = ebayComps.length > INITIAL_COMP_COUNT;

  return (
    <div className="space-y-6">
      <DualImageUpload onImagesReady={handleImagesReady} disabled={scanning} />

      {frontImage && !result && !scanning && (
        <button
          onClick={handleScan}
          className="w-full py-3 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold hover:bg-[var(--green-hover)] transition-colors cursor-pointer"
        >
          Scan & Identify Card
        </button>
      )}

      {scanning && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-[var(--green)]">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="font-medium">Scanning, identifying, and finding comps...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {result && frontImage && (
        <div className="space-y-4">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)]">Scan Results</h3>
              <GradeBadge grade={result.overallGrade} size="lg" />
            </div>

            {overriddenFromIndex !== null && (
              <div className="bg-[var(--bg-green-glow)] border border-[var(--green)]/30 rounded-lg p-3 text-xs text-[var(--green)]">
                ✓ Card info updated from eBay listing #{overriddenFromIndex + 1}.
                Review the values below before saving.
              </div>
            )}

            <div className="text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">{result.overallLabel}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{result.cardIdentification}</p>
              {result.estimatedValueCents != null && (
                <p className="text-lg font-bold text-[var(--green)] mt-2">
                  Est. {formatCurrency(result.estimatedValueCents)}
                </p>
              )}
              {result.variantConfidence === "low" && (
                <p className="text-xs text-yellow-400 mt-1">
                  ⚠ Low variant confidence — pick a matching listing below if available
                </p>
              )}
            </div>

            <GradeBreakdown subGrades={result.subGrades} />

            <p className="text-sm text-[var(--text-secondary)]">{result.explanation}</p>

            <button
              onClick={() =>
                frontImage &&
                onScanComplete(
                  result,
                  { base64: frontImage.base64, mediaType: frontImage.mediaType },
                  backImage ? { base64: backImage.base64, mediaType: backImage.mediaType } : undefined
                )
              }
              className="w-full py-2.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold hover:bg-[var(--green-hover)] transition-colors cursor-pointer"
            >
              Use These Results
            </button>
          </div>

          {/* Visual comps from eBay */}
          {ebayComps.length > 0 && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h3 className="font-semibold text-[var(--text-primary)] text-sm">
                  Similar Listings on eBay
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  If the scan got the variant wrong, click <span className="text-[var(--green)] font-semibold">&quot;Use this info&quot;</span> on the listing that matches yours.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                {visibleComps.map((comp, i) => {
                  const isOverridden = overriddenFromIndex === i;
                  const isParsing = parsingIndex === i;
                  return (
                    <div
                      key={i}
                      className={`group bg-[var(--bg-primary)] rounded-lg border overflow-hidden transition-colors ${
                        isOverridden
                          ? "border-[var(--green)]"
                          : "border-[var(--border)] hover:border-[var(--green)]/30"
                      }`}
                    >
                      {comp.image_url && (
                        <a
                          href={comp.listing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={comp.image_url}
                            alt=""
                            className="w-full aspect-square object-contain bg-white"
                          />
                        </a>
                      )}
                      <div className="p-2">
                        <a
                          href={comp.listing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-tight hover:text-[var(--text-primary)]">
                            {comp.title}
                          </p>
                          <p className="text-sm font-bold text-[var(--green)] mt-1">
                            {formatCurrency(comp.price_cents)}
                          </p>
                        </a>
                        <button
                          onClick={() => handleUseListingInfo(comp, i)}
                          disabled={isParsing || isOverridden}
                          className={`w-full mt-2 px-2 py-1 rounded text-[10px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                            isOverridden
                              ? "bg-[var(--green)] text-[var(--bg-primary)]"
                              : isParsing
                                ? "bg-[var(--bg-card-hover)] text-[var(--text-muted)]"
                                : "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--green)] hover:text-[var(--green)]"
                          }`}
                        >
                          {isOverridden
                            ? "✓ USING THIS"
                            : isParsing
                              ? "PARSING..."
                              : "USE THIS INFO"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {hasMore && (
                <button
                  onClick={() => setShowAllComps(!showAllComps)}
                  className="w-full px-4 py-2 text-xs text-[var(--green)] font-semibold border-t border-[var(--border)] hover:bg-[var(--bg-primary)] cursor-pointer"
                >
                  {showAllComps
                    ? `Show fewer (top ${INITIAL_COMP_COUNT})`
                    : `Show ${ebayComps.length - INITIAL_COMP_COUNT} more listings`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
