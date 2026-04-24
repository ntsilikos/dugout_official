"use client";

import { useEffect, useState } from "react";

const SPORTS = ["Baseball", "Basketball", "Football", "Hockey", "Soccer"];
const GRADERS = ["Any", "PSA", "BGS", "SGC", "CGC"];

const ALL_MARKETPLACES: { id: string; label: string }[] = [
  { id: "ebay", label: "eBay" },
  { id: "tiktok", label: "TikTok Shop" },
];

export interface SearchFilters {
  athlete: string;
  sport: string;
  year_min: string;
  year_max: string;
  manufacturer: string;
  parallel: string;
  set_name: string;
  card_number: string;
  grader: string;
  grade_min: string;
  grade_max: string;
  autographed: boolean;
}

interface SearchFormProps {
  initialName?: string;
  initialFilters?: Partial<SearchFilters>;
  initialMaxPrice?: string;
  initialMarketplaces?: string[];
  onSubmit: (data: {
    name: string;
    filters: SearchFilters;
    max_price_cents: number | null;
    marketplaces: string[];
  }) => Promise<void>;
  submitLabel?: string;
}

export default function SearchForm({
  initialName = "",
  initialFilters,
  initialMaxPrice = "",
  initialMarketplaces,
  onSubmit,
  submitLabel = "Save and Start Search",
}: SearchFormProps) {
  const [name, setName] = useState(initialName);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [saving, setSaving] = useState(false);
  const [marketplaces, setMarketplaces] = useState<string[]>(
    initialMarketplaces && initialMarketplaces.length > 0
      ? initialMarketplaces
      : []
  );
  const [configured, setConfigured] = useState<Record<string, boolean>>({});
  const [filters, setFilters] = useState<SearchFilters>({
    athlete: initialFilters?.athlete || "",
    sport: initialFilters?.sport || "",
    year_min: initialFilters?.year_min || "",
    year_max: initialFilters?.year_max || "",
    manufacturer: initialFilters?.manufacturer || "",
    parallel: initialFilters?.parallel || "",
    set_name: initialFilters?.set_name || "",
    card_number: initialFilters?.card_number || "",
    grader: initialFilters?.grader || "",
    grade_min: initialFilters?.grade_min || "",
    grade_max: initialFilters?.grade_max || "",
    autographed: initialFilters?.autographed || false,
  });

  // Auto-select all configured marketplaces by default if none were preselected
  useEffect(() => {
    fetch("/api/config/status")
      .then((r) => r.json())
      .then((data) => {
        setConfigured(data || {});
        if (
          marketplaces.length === 0 &&
          (!initialMarketplaces || initialMarketplaces.length === 0)
        ) {
          const defaults = ALL_MARKETPLACES.filter((mp) => data[mp.id]).map(
            (mp) => mp.id
          );
          if (defaults.length > 0) setMarketplaces(defaults);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFilter = (key: keyof SearchFilters, value: string | boolean) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMarketplace = (id: string) => {
    setMarketplaces((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        name,
        filters,
        max_price_cents: maxPrice ? Math.round(parseFloat(maxPrice) * 100) : null,
        marketplaces,
      });
    } finally {
      setSaving(false);
    }
  };

  const filledCount = Object.entries(filters).filter(
    ([k, v]) => k !== "autographed" && v !== "" && v !== false
  ).length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Search Name */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Search Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
          placeholder="e.g. LeBron Rookies PSA 9+"
        />
      </div>

      {/* Filters */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[var(--text-primary)]">Filters</h3>
          {filledCount < 2 && (
            <span className="text-xs text-amber-600 font-medium">
              Set at least 2 filters
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Athlete</label>
            <input
              type="text"
              value={filters.athlete}
              onChange={(e) => updateFilter("athlete", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="Athlete"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Sport</label>
            <select
              value={filters.sport}
              onChange={(e) => updateFilter("sport", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
            >
              <option value="">Any Sport</option>
              {SPORTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Year</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={filters.year_min}
                onChange={(e) => updateFilter("year_min", e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="Min"
              />
              <input
                type="number"
                value={filters.year_max}
                onChange={(e) => updateFilter("year_max", e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="Max"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Manufacturer</label>
            <input
              type="text"
              value={filters.manufacturer}
              onChange={(e) => updateFilter("manufacturer", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="Manufacturer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Parallel</label>
            <input
              type="text"
              value={filters.parallel}
              onChange={(e) => updateFilter("parallel", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="Parallel"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Set</label>
            <input
              type="text"
              value={filters.set_name}
              onChange={(e) => updateFilter("set_name", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="Set"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Card Number</label>
            <input
              type="text"
              value={filters.card_number}
              onChange={(e) => updateFilter("card_number", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="Card Number"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Grader</label>
            <select
              value={filters.grader}
              onChange={(e) => updateFilter("grader", e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
            >
              <option value="">Select</option>
              {GRADERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Grade Range</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={filters.grade_min}
                onChange={(e) => updateFilter("grade_min", e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="Min"
              />
              <input
                type="number"
                min="1"
                max="10"
                step="0.5"
                value={filters.grade_max}
                onChange={(e) => updateFilter("grade_max", e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="Max"
              />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.autographed}
            onChange={(e) => updateFilter("autographed", e.target.checked)}
            className="w-4 h-4 text-[var(--green)] rounded"
          />
          <span className="text-sm text-[var(--text-secondary)]">Autographed only</span>
        </label>
      </div>

      {/* Marketplaces to search */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">
            Search These Marketplaces
          </h3>
          {marketplaces.length === 0 && (
            <span className="text-xs text-amber-500 font-medium">
              Pick at least one
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Only configured marketplaces are selectable. Connect more in Settings.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_MARKETPLACES.map((mp) => {
            const isConfigured = configured[mp.id] === true;
            const isSelected = marketplaces.includes(mp.id);
            return (
              <button
                key={mp.id}
                type="button"
                onClick={() => isConfigured && toggleMarketplace(mp.id)}
                disabled={!isConfigured}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  !isConfigured
                    ? "bg-[var(--bg-card-hover)] text-[var(--text-muted)] cursor-not-allowed opacity-50"
                    : isSelected
                      ? "bg-[var(--green)] text-[var(--bg-primary)]"
                      : "border border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--green)] hover:text-[var(--green)]"
                }`}
                title={!isConfigured ? "Not configured" : ""}
              >
                {isSelected ? "✓ " : ""}
                {mp.label}
                {!isConfigured && " (not configured)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* Max Price */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm">
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
          Max Price ($)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
          placeholder="No limit"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !name || filledCount < 2 || marketplaces.length === 0}
          className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
