"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Breadcrumb from "@/app/components/ui/Breadcrumb";

interface SetCard {
  id: string;
  card_number: string;
  card_name: string | null;
  is_owned: boolean;
  card_id: string | null;
}

interface CardSet {
  id: string;
  name: string;
  year: number | null;
  brand: string | null;
  sport: string | null;
  total_cards: number;
}

export default function SetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [set, setSet] = useState<CardSet | null>(null);
  const [cards, setCards] = useState<SetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addRange, setAddRange] = useState(false);
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/sets/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSet(data.set || null);
        setCards(data.cards || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleAddRange = async () => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    if (!start || !end || end < start || end - start > 500) return;
    setAdding(true);
    const newCards = [];
    for (let i = start; i <= end; i++) {
      newCards.push({ card_number: String(i) });
    }
    const res = await fetch(`/api/sets/${id}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cards: newCards }),
    });
    if (res.ok) {
      // Refresh
      const detail = await fetch(`/api/sets/${id}`).then((r) => r.json());
      setCards(detail.cards || []);
      setAddRange(false);
      setRangeStart("");
      setRangeEnd("");
    }
    setAdding(false);
  };

  const toggleOwned = async (setCardId: string, isOwned: boolean) => {
    setCards((prev) =>
      prev.map((c) => (c.id === setCardId ? { ...c, is_owned: !isOwned } : c))
    );
    await fetch(`/api/sets/${id}/cards`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: setCardId, is_owned: !isOwned }),
    });
  };

  const handleHuntMissing = async () => {
    const missing = cards.filter((c) => !c.is_owned);
    if (!missing.length || !set) return;
    const keyword = [set.year, set.brand, set.name].filter(Boolean).join(" ");
    const res = await fetch("/api/hunters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Missing from ${set.name}`,
        filters: {
          athlete: "",
          sport: set.sport || "",
          manufacturer: set.brand || "",
          set_name: set.name || "",
          year_min: set.year ? String(set.year) : "",
          year_max: set.year ? String(set.year) : "",
        },
        marketplaces: ["ebay"],
      }),
    });
    const data = await res.json();
    if (data.search) router.push(`/hunters/${data.search.id}`);
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await fetch(`/api/sets/${id}`, { method: "DELETE" });
    router.push("/sets");
  };

  if (loading) {
    return <div className="max-w-3xl mx-auto animate-pulse"><div className="h-8 bg-[var(--bg-card-hover)] rounded w-48" /></div>;
  }

  if (!set) {
    return <div className="text-center py-12"><p className="text-[var(--text-muted)]">Set not found.</p><Link href="/sets" className="text-[var(--green)] text-sm">Back to sets</Link></div>;
  }

  const ownedCount = cards.filter((c) => c.is_owned).length;
  const pct = set.total_cards > 0 ? Math.round((ownedCount / set.total_cards) * 100) : (cards.length > 0 ? Math.round((ownedCount / cards.length) * 100) : 0);
  const missingCount = cards.filter((c) => !c.is_owned).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Sets", href: "/sets" }, { label: set.name }]} />
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{set.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">{[set.year, set.brand, set.sport].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex gap-2">
            {missingCount > 0 && (
              <button onClick={handleHuntMissing} className="px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] cursor-pointer">
                Hunt {missingCount} Missing
              </button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer">
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[var(--text-secondary)]">Completion</span>
          <span className="text-lg font-bold text-[var(--green)]">{pct}%</span>
        </div>
        <div className="w-full bg-[var(--bg-card-hover)] rounded-full h-3">
          <div className="h-3 rounded-full bg-[var(--bg-green-glow)]0 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">{ownedCount} owned / {cards.length} tracked / {set.total_cards} total in set</p>
      </div>

      {/* Add cards */}
      <div className="flex items-center gap-3">
        <button onClick={() => setAddRange(!addRange)} className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)] cursor-pointer">
          {addRange ? "Cancel" : "Add Card Range"}
        </button>
      </div>

      {addRange && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm flex items-end gap-3">
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">Start #</label>
            <input type="number" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="w-24 px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm outline-none" />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-secondary)] mb-1">End #</label>
            <input type="number" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="w-24 px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm outline-none" />
          </div>
          <button onClick={handleAddRange} disabled={adding} className="px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">
            {adding ? "Adding..." : "Add"}
          </button>
        </div>
      )}

      {/* Card checklist */}
      {cards.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-8 text-center shadow-sm">
          <p className="text-[var(--text-muted)] text-sm">No cards tracked yet. Add a range to get started.</p>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-px bg-[var(--bg-card-hover)]">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => toggleOwned(card.id, card.is_owned)}
                className={`p-3 text-center cursor-pointer transition-colors ${
                  card.is_owned
                    ? "bg-[var(--bg-green-glow)] text-[var(--green)]"
                    : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-primary)]"
                }`}
              >
                <p className="text-sm font-bold">#{card.card_number}</p>
                {card.card_name && (
                  <p className="text-[10px] truncate">{card.card_name}</p>
                )}
                {card.is_owned && (
                  <svg className="w-4 h-4 mx-auto mt-1 text-[var(--green)]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete set?"
        message={`"${set?.name}" and all its tracked cards will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
