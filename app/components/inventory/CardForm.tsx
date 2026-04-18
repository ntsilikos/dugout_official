"use client";

import { useState } from "react";

const SPORTS = ["Baseball", "Basketball", "Football", "Hockey", "Soccer"];

export interface CardFormData {
  player_name: string;
  year: string;
  brand: string;
  set_name: string;
  card_number: string;
  variant: string;
  sport: string;
  condition: "raw" | "graded";
  grade_company: string;
  grade_value: string;
  estimated_value_cents: string;
  purchase_price_cents: string;
  notes: string;
}

interface CardFormProps {
  initialData?: Partial<CardFormData>;
  onSubmit: (data: CardFormData) => Promise<void>;
  submitLabel?: string;
}

export default function CardForm({
  initialData,
  onSubmit,
  submitLabel = "Save Card",
}: CardFormProps) {
  const [data, setData] = useState<CardFormData>({
    player_name: initialData?.player_name || "",
    year: initialData?.year || "",
    brand: initialData?.brand || "",
    set_name: initialData?.set_name || "",
    card_number: initialData?.card_number || "",
    variant: initialData?.variant || "",
    sport: initialData?.sport || "",
    condition: initialData?.condition || "raw",
    grade_company: initialData?.grade_company || "",
    grade_value: initialData?.grade_value || "",
    estimated_value_cents: initialData?.estimated_value_cents || "",
    purchase_price_cents: initialData?.purchase_price_cents || "",
    notes: initialData?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const update = (field: keyof CardFormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(data);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Card Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Player Name</label>
            <input
              type="text"
              value={data.player_name}
              onChange={(e) => update("player_name", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="e.g. Mike Trout"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Year</label>
            <input
              type="number"
              value={data.year}
              onChange={(e) => update("year", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="e.g. 2024"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Brand</label>
            <input
              type="text"
              value={data.brand}
              onChange={(e) => update("brand", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="e.g. Topps"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Set</label>
            <input
              type="text"
              value={data.set_name}
              onChange={(e) => update("set_name", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="e.g. Chrome"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Card Number</label>
            <input
              type="text"
              value={data.card_number}
              onChange={(e) => update("card_number", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="e.g. 150"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Variant / Parallel</label>
            <input
              type="text"
              value={data.variant}
              onChange={(e) => update("variant", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="e.g. Refractor"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Sport</label>
            <select
              value={data.sport}
              onChange={(e) => update("sport", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
            >
              <option value="">Select sport</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-[var(--text-primary)]">Condition & Value</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Condition</label>
            <select
              value={data.condition}
              onChange={(e) => update("condition", e.target.value as "raw" | "graded")}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
            >
              <option value="raw">Raw</option>
              <option value="graded">Graded</option>
            </select>
          </div>
          {data.condition === "graded" && (
            <>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Grade Company</label>
                <select
                  value={data.grade_company}
                  onChange={(e) => update("grade_company", e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                >
                  <option value="">Select</option>
                  <option value="PSA">PSA</option>
                  <option value="BGS">BGS</option>
                  <option value="SGC">SGC</option>
                  <option value="CGC">CGC</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Grade</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="10"
                  value={data.grade_value}
                  onChange={(e) => update("grade_value", e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
                  placeholder="e.g. 9.5"
                />
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Estimated Value ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.estimated_value_cents ? (parseFloat(data.estimated_value_cents) / 100).toFixed(2) : ""}
              onChange={(e) => update("estimated_value_cents", String(Math.round(parseFloat(e.target.value || "0") * 100)))}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Purchase Price ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={data.purchase_price_cents ? (parseFloat(data.purchase_price_cents) / 100).toFixed(2) : ""}
              onChange={(e) => update("purchase_price_cents", String(Math.round(parseFloat(e.target.value || "0") * 100)))}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
        <textarea
          value={data.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none resize-none"
          placeholder="Any additional notes about this card..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
