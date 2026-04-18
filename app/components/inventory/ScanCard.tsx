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

export default function ScanCard({ onScanComplete }: ScanCardProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [frontImage, setFrontImage] = useState<ImageData | null>(null);
  const [backImage, setBackImage] = useState<ImageData | null>(null);
  const [ebayComps, setEbayComps] = useState<EbayComp[]>([]);

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

            <div className="text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">{result.overallLabel}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{result.cardIdentification}</p>
              {result.estimatedValueCents && (
                <p className="text-lg font-bold text-[var(--green)] mt-2">
                  Est. {formatCurrency(result.estimatedValueCents)}
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
                  Compare these to verify the scan identified your card correctly
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
                {ebayComps.map((comp, i) => (
                  <a
                    key={i}
                    href={comp.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group bg-[var(--bg-primary)] rounded-lg border border-[var(--border)] overflow-hidden hover:border-[var(--green)]/30 transition-colors"
                  >
                    {comp.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comp.image_url}
                        alt=""
                        className="w-full aspect-square object-contain bg-white"
                      />
                    )}
                    <div className="p-2">
                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-tight">
                        {comp.title}
                      </p>
                      <p className="text-sm font-bold text-[var(--green)] mt-1">
                        {formatCurrency(comp.price_cents)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
