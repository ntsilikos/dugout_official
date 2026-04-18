"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanResult } from "@/lib/types";
import ScanCard from "@/app/components/inventory/ScanCard";
import CardForm, { type CardFormData } from "@/app/components/inventory/CardForm";
import BulkScan from "@/app/components/inventory/BulkScan";

type Tab = "scan" | "bulk" | "manual" | "cert";

function getPSALabel(grade: number): string {
  const labels: Record<number, string> = {
    10: "Gem Mint", 9: "Mint", 8: "Near Mint-Mint", 7: "Near Mint",
    6: "Excellent-Mint", 5: "Excellent", 4: "Very Good-Excellent",
    3: "Very Good", 2: "Good", 1: "Poor",
  };
  return labels[grade] || "";
}

export default function AddCardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("scan");
  const [scanData, setScanData] = useState<{
    result: ScanResult;
    imageData: { base64: string; mediaType: string };
    backImage?: { base64: string; mediaType: string };
  } | null>(null);
  const [certCompany, setCertCompany] = useState("PSA");
  const [certNumber, setCertNumber] = useState("");
  const [certLooking, setCertLooking] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [certData, setCertData] = useState<Partial<CardFormData> | null>(null);

  const handleScanComplete = (
    result: ScanResult,
    imageData: { base64: string; mediaType: string },
    backImage?: { base64: string; mediaType: string }
  ) => {
    setScanData({ result, imageData, backImage });
  };

  const handleSubmit = async (formData: CardFormData) => {
    const body: Record<string, unknown> = {
      player_name: formData.player_name || null,
      year: formData.year ? parseInt(formData.year) : null,
      brand: formData.brand || null,
      set_name: formData.set_name || null,
      card_number: formData.card_number || null,
      variant: formData.variant || null,
      sport: formData.sport || null,
      condition: formData.condition || "raw",
      grade_company: formData.grade_company || null,
      grade_value: formData.grade_value ? parseFloat(formData.grade_value) : null,
      grade_label: formData.grade_value ? getPSALabel(Math.round(parseFloat(formData.grade_value))) : null,
      estimated_value_cents: formData.estimated_value_cents ? parseInt(formData.estimated_value_cents) : null,
      purchase_price_cents: formData.purchase_price_cents ? parseInt(formData.purchase_price_cents) : null,
      notes: formData.notes || null,
    };

    if (scanData?.result) {
      body.ai_identification = scanData.result;
      if (!body.grade_company) body.grade_company = "AI";
      if (!body.grade_value) body.grade_value = scanData.result.overallGrade;
      if (!body.grade_label) body.grade_label = scanData.result.overallLabel;
      // Save CardHedge ID if the scan was verified
      const chId = (scanData.result as unknown as Record<string, unknown>).cardhedgeCardId;
      if (chId) body.cardhedge_card_id = chId;
    }

    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const { card } = await res.json();

    // Upload front image
    if (card && scanData?.imageData) {
      await fetch(`/api/cards/${card.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: scanData.imageData.base64,
          mediaType: scanData.imageData.mediaType,
          side: "front",
        }),
      });
    }

    // Upload back image if provided
    if (card && scanData?.backImage) {
      await fetch(`/api/cards/${card.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: scanData.backImage.base64,
          mediaType: scanData.backImage.mediaType,
          side: "back",
        }),
      });
    }

    router.push(`/inventory/${card.id}`);
  };

  const scanFormDefaults = scanData?.result
    ? {
        player_name: scanData.result.playerName || "",
        year: scanData.result.year ? String(scanData.result.year) : "",
        brand: scanData.result.brand || "",
        set_name: scanData.result.setName || "",
        card_number: scanData.result.cardNumber || "",
        variant: scanData.result.variant || "",
        sport: scanData.result.sport || "",
        condition: "raw" as const,
        grade_company: "AI",
        grade_value: String(scanData.result.overallGrade),
        estimated_value_cents: scanData.result.estimatedValueCents
          ? String(scanData.result.estimatedValueCents)
          : "",
        purchase_price_cents: "",
        notes: "",
      }
    : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Add Card</h1>

      {/* Tab toggle */}
      <div className="flex gap-1 bg-[var(--bg-card-hover)] p-1 rounded-lg w-fit">
        <button
          onClick={() => { setTab("scan"); setScanData(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            tab === "scan"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          AI Scan
        </button>
        <button
          onClick={() => { setTab("bulk"); setScanData(null); setCertData(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            tab === "bulk"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Bulk Scan
        </button>
        <button
          onClick={() => { setTab("manual"); setScanData(null); setCertData(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            tab === "manual"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Manual Entry
        </button>
        <button
          onClick={() => { setTab("cert"); setScanData(null); setCertData(null); setCertError(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
            tab === "cert"
              ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          Cert Lookup
        </button>
      </div>

      {tab === "scan" && !scanData && (
        <ScanCard onScanComplete={handleScanComplete} />
      )}

      {tab === "bulk" && (
        <BulkScan onComplete={() => router.push("/inventory")} />
      )}

      {tab === "cert" && !certData && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Look Up Graded Card</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Grading Company</label>
              <select
                value={certCompany}
                onChange={(e) => setCertCompany(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              >
                <option value="PSA">PSA</option>
                <option value="BGS">BGS</option>
                <option value="SGC">SGC</option>
                <option value="CGC">CGC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Cert Number</label>
              <input
                type="text"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="e.g. 12345678"
              />
            </div>
          </div>
          {certError && <p className="text-sm text-red-600">{certError}</p>}
          <button
            onClick={async () => {
              if (!certNumber.trim()) return;
              setCertLooking(true);
              setCertError(null);
              try {
                const res = await fetch("/api/cards/cert-lookup", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ company: certCompany, cert_number: certNumber }),
                });
                const data = await res.json();
                if (data.result) {
                  setCertData({
                    player_name: data.result.player_name || "",
                    year: data.result.year ? String(data.result.year) : "",
                    brand: data.result.brand || "",
                    set_name: data.result.set_name || "",
                    card_number: data.result.card_number || "",
                    variant: data.result.variant || "",
                    sport: data.result.sport || "",
                    condition: "graded",
                    grade_company: data.result.grade_company || certCompany,
                    grade_value: data.result.grade_value ? String(data.result.grade_value) : "",
                    estimated_value_cents: "",
                    purchase_price_cents: "",
                    notes: `Cert #${certNumber}`,
                  });
                } else {
                  setCertError(data.error || "Certificate not found");
                }
              } catch {
                setCertError("Failed to look up certificate");
              }
              setCertLooking(false);
            }}
            disabled={certLooking || !certNumber.trim()}
            className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
          >
            {certLooking ? "Looking up..." : "Look Up"}
          </button>
        </div>
      )}

      {(tab === "manual" || scanData || certData) && (
        <CardForm
          initialData={scanFormDefaults || certData || undefined}
          onSubmit={handleSubmit}
          submitLabel="Add to Collection"
        />
      )}
    </div>
  );
}
