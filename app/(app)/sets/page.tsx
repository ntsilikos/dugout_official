"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useToast } from "@/app/components/ui/Toast";

interface CardSet {
  id: string;
  name: string;
  year: number | null;
  brand: string | null;
  sport: string | null;
  total_cards: number;
  owned_count: number;
}

interface CardHedgeSetResult {
  cardhedge_set_id: string;
  name: string;
  year: number | null;
  set_type: string;
  category: string;
  image: string | null;
  popularity: number;
}

type CreateMode = "search" | "manual";

export default function SetsPage() {
  const toast = useToast();
  const [sets, setSets] = useState<CardSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [mode, setMode] = useState<CreateMode>("search");

  // Search-mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CardHedgeSetResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickedSet, setPickedSet] = useState<CardHedgeSetResult | null>(null);
  const [importing, setImporting] = useState(false);

  // Manual-mode state
  const [formName, setFormName] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formSport, setFormSport] = useState("");
  const [formTotal, setFormTotal] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/sets")
      .then((res) => res.json())
      .then((data) => {
        setSets(data.sets || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Live search as user types (debounced via state checks)
  useEffect(() => {
    if (mode !== "search" || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/sets/search?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await res.json();
        setSearchResults(data.sets || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [searchQuery, mode]);

  const closeModal = () => {
    setShowCreate(false);
    setPickedSet(null);
    setSearchQuery("");
    setSearchResults([]);
    setFormName("");
    setFormYear("");
    setFormBrand("");
    setFormSport("");
    setFormTotal("");
  };

  const handleImport = async () => {
    if (!pickedSet) return;
    setImporting(true);
    try {
      const res = await fetch("/api/sets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pickedSet.name,
          year: pickedSet.year,
          brand: pickedSet.set_type,
          sport: pickedSet.category,
          cardhedge_set_name: pickedSet.name,
        }),
      });
      const data = await res.json();
      if (res.ok && data.set) {
        setSets((prev) => [data.set, ...prev]);
        toast.success(
          `Imported ${data.imported} cards${data.truncated ? ` (capped at ${data.imported})` : ""}.`
        );
        closeModal();
      } else {
        toast.error(data.message || data.error || "Import failed");
      }
    } catch {
      toast.error("Couldn't reach the import service");
    } finally {
      setImporting(false);
    }
  };

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        year: formYear ? parseInt(formYear) : null,
        brand: formBrand || null,
        sport: formSport || null,
        total_cards: formTotal ? parseInt(formTotal) : 0,
      }),
    });
    const data = await res.json();
    if (data.set) {
      setSets((prev) => [{ ...data.set, owned_count: 0 }, ...prev]);
      closeModal();
    }
    setCreating(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">
          SET TRACKER
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Track New Set
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Track New Set</h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 bg-[var(--bg-card-hover)] p-1 mx-6 mt-4 rounded-lg w-fit">
              <button
                onClick={() => {
                  setMode("search");
                  setPickedSet(null);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  mode === "search"
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                Search Database
              </button>
              <button
                onClick={() => setMode("manual")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
                  mode === "manual"
                    ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)]"
                }`}
              >
                Manual Entry
              </button>
            </div>

            {/* Search mode */}
            {mode === "search" && (
              <div className="px-6 py-4 overflow-y-auto flex-1">
                {!pickedSet ? (
                  <>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search sets… e.g. '2024 Topps Chrome'"
                      autoFocus
                      className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)] mb-3"
                    />
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                      Powered by CardHedge. Pick a set to import its checklist automatically.
                    </p>

                    {searching && (
                      <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                        Searching...
                      </p>
                    )}

                    {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                      <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                        No sets found. Try different keywords or use Manual Entry.
                      </p>
                    )}

                    <div className="space-y-2">
                      {searchResults.map((s) => (
                        <button
                          key={s.cardhedge_set_id}
                          onClick={() => setPickedSet(s)}
                          className="w-full flex items-center gap-3 p-2 bg-[var(--bg-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg border border-[var(--border)] hover:border-[var(--green)]/30 transition-colors text-left cursor-pointer"
                        >
                          {s.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.image}
                              alt=""
                              className="w-10 h-14 object-contain bg-black/20 rounded shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 bg-[var(--bg-card-hover)] rounded shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                              {s.name}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {[s.year, s.category].filter(Boolean).join(" · ")}
                              {s.popularity > 0 && ` · ${s.popularity.toLocaleString()} sales/30d`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Confirmation step */
                  <div className="space-y-4">
                    <button
                      onClick={() => setPickedSet(null)}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1"
                    >
                      ← Back to search
                    </button>
                    <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border)]">
                      {pickedSet.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pickedSet.image}
                          alt=""
                          className="w-16 h-22 object-contain bg-black/20 rounded shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-[var(--text-primary)]">
                          {pickedSet.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {[pickedSet.year, pickedSet.category].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <div className="bg-[var(--bg-green-glow)] border border-[var(--green)]/30 rounded-lg p-3">
                      <p className="text-xs text-[var(--text-secondary)]">
                        We&apos;ll fetch the checklist (up to 500 unique card numbers, base
                        variants prioritized) and pre-populate this set for you. Cards you own
                        will auto-mark as you add them to inventory.
                      </p>
                    </div>
                    <button
                      onClick={handleImport}
                      disabled={importing}
                      className="w-full py-2.5 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg font-semibold hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
                    >
                      {importing ? "Importing checklist..." : "Import Checklist"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Manual mode */}
            {mode === "manual" && (
              <form onSubmit={handleManualCreate} className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="Set name (e.g. 2024 Topps Series 1)"
                  className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    value={formYear}
                    onChange={(e) => setFormYear(e.target.value)}
                    placeholder="Year"
                    className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]"
                  />
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Brand"
                    className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]"
                  />
                  <select
                    value={formSport}
                    onChange={(e) => setFormSport(e.target.value)}
                    className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]"
                  >
                    <option value="">Sport</option>
                    <option>Baseball</option>
                    <option>Basketball</option>
                    <option>Football</option>
                    <option>Hockey</option>
                    <option>Soccer</option>
                  </select>
                  <input
                    type="number"
                    value={formTotal}
                    onChange={(e) => setFormTotal(e.target.value)}
                    placeholder="Total cards"
                    className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating || !formName}
                  className="w-full py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
                >
                  {creating ? "Creating..." : "Create Empty Set"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 animate-pulse"
            >
              <div className="h-5 bg-[var(--bg-card-hover)] rounded w-48" />
            </div>
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Track your first set</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Search for any set and we&apos;ll auto-import the checklist.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] cursor-pointer"
          >
            Track New Set
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map((set) => {
            const pct = set.total_cards > 0 ? Math.round((set.owned_count / set.total_cards) * 100) : 0;
            return (
              <Link
                key={set.id}
                href={`/sets/${set.id}`}
                className="block bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-[var(--text-primary)]">{set.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      {[set.year, set.brand, set.sport].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-[var(--green)]">{pct}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[var(--bg-card-hover)] rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-[var(--green)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    {set.owned_count}/{set.total_cards}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
