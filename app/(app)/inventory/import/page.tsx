"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Breadcrumb from "@/app/components/ui/Breadcrumb";

interface ParsedRow {
  [key: string]: string;
}

const CARD_FIELDS = [
  { key: "player_name", label: "Player Name" },
  { key: "year", label: "Year" },
  { key: "brand", label: "Brand" },
  { key: "set_name", label: "Set" },
  { key: "card_number", label: "Card Number" },
  { key: "variant", label: "Variant" },
  { key: "sport", label: "Sport" },
  { key: "condition", label: "Condition" },
  { key: "grade_company", label: "Grader" },
  { key: "grade_value", label: "Grade" },
  { key: "estimated_value_cents", label: "Value (cents)" },
  { key: "purchase_price_cents", label: "Cost (cents)" },
  { key: "notes", label: "Notes" },
];

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
  return { headers, rows };
}

export default function ImportPage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "map" | "preview" | "done">("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);

      // Auto-map matching headers
      const autoMap: Record<string, string> = {};
      for (const field of CARD_FIELDS) {
        const match = h.find(
          (header) =>
            header.toLowerCase().replace(/[^a-z]/g, "") ===
            field.label.toLowerCase().replace(/[^a-z]/g, "")
        );
        if (match) autoMap[field.key] = match;
      }
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    const mappedRows = rows.map((row) => {
      const mapped: Record<string, string | number | null> = {};
      for (const field of CARD_FIELDS) {
        const csvCol = mapping[field.key];
        if (csvCol && row[csvCol]) {
          if (["year", "grade_value", "estimated_value_cents", "purchase_price_cents"].includes(field.key)) {
            mapped[field.key] = parseFloat(row[csvCol]) || null;
          } else {
            mapped[field.key] = row[csvCol];
          }
        }
      }
      return mapped;
    });

    const res = await fetch("/api/cards/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: mappedRows }),
    });

    const data = await res.json();
    setImportedCount(data.imported || 0);
    setStep("done");
    setImporting(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Inventory", href: "/inventory" }, { label: "Import" }]} />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">Import Cards</h1>
      </div>

      {step === "upload" && (
        <div
          className="bg-[var(--bg-card)] rounded-xl border-2 border-dashed border-[var(--border-strong)] p-12 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv,.tsv,.txt";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          <svg className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-lg font-medium text-[var(--text-secondary)]">Drop a CSV file here</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">or click to browse</p>
        </div>
      )}

      {step === "map" && (
        <div className="space-y-6">
          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">
              Map Columns ({rows.length} rows found)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CARD_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    {field.label}
                  </label>
                  <select
                    value={mapping[field.key] || ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                  >
                    <option value="">— Skip —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep("upload")}
              className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium cursor-pointer"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing || Object.keys(mapping).length === 0}
              className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
            >
              {importing ? "Importing..." : `Import ${rows.length} Cards`}
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Import Complete
          </h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Successfully imported {importedCount} cards to your collection.
          </p>
          <Link
            href="/inventory"
            className="inline-flex px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] transition-colors"
          >
            View Inventory
          </Link>
        </div>
      )}
    </div>
  );
}
