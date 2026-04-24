"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import { formatCurrency, formatDate, getCardTitle } from "@/lib/utils";
import GradeBadge from "@/app/components/GradeBadge";
import CostIndicator from "@/app/components/repacks/CostIndicator";
import CardPicker from "@/app/components/repacks/CardPicker";
import { useToast } from "@/app/components/ui/Toast";

interface RepackItem {
  id: string;
  card_id: string;
  cards: {
    id: string;
    player_name: string | null;
    year: number | null;
    brand: string | null;
    set_name: string | null;
    card_number: string | null;
    sport: string | null;
    grade_value: number | null;
    estimated_value_cents: number | null;
    card_images?: { url?: string; is_primary: boolean }[];
  };
}

interface Repack {
  id: string;
  name: string;
  description: string | null;
  target_items: number | null;
  target_cost_cents: number | null;
  ceiling_cost_cents: number | null;
  floor_cost_cents: number | null;
  status: string;
  is_template: boolean;
  sold_at: string | null;
  sold_price_cents: number | null;
}

export default function RepackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [repack, setRepack] = useState<Repack | null>(null);
  const [items, setItems] = useState<RepackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [selling, setSelling] = useState(false);

  const fetchData = () => {
    fetch(`/api/repacks/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRepack(data.repack || null);
        setItems(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddCards = async (cardIds: string[]) => {
    if (cardIds.length === 0) return;
    const res = await fetch(`/api/repacks/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_ids: cardIds }),
    });
    if (res.ok) {
      toast.success(`Added ${cardIds.length} card${cardIds.length === 1 ? "" : "s"}.`);
      fetchData();
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error || "Failed to add cards");
    }
  };

  const handleRemoveCard = async (cardId: string) => {
    await fetch(`/api/repacks/${id}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId }),
    });
    setItems((prev) => prev.filter((i) => i.card_id !== cardId));
    toast.info("Card removed.");
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await fetch(`/api/repacks/${id}`, { method: "DELETE" });
    router.push("/repacks");
  };

  const handleSell = async () => {
    const priceCents = Math.round(parseFloat(sellPrice) * 100);
    if (!priceCents || priceCents <= 0) {
      toast.error("Enter a valid sale price.");
      return;
    }
    setSelling(true);
    try {
      const res = await fetch(`/api/repacks/${id}/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sold_price_cents: priceCents }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `Sold for ${formatCurrency(priceCents)}. ${data.cardsMarkedSold} cards marked as sold.`
        );
        setShowSellModal(false);
        setSellPrice("");
        fetchData();
      } else {
        toast.error(data.error || "Failed to mark as sold");
      }
    } catch {
      toast.error("Couldn't reach the server");
    } finally {
      setSelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto animate-pulse space-y-4">
        <div className="h-8 bg-[var(--bg-card-hover)] rounded w-64" />
        <div className="h-32 bg-[var(--bg-card-hover)] rounded-xl" />
      </div>
    );
  }

  if (!repack) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Repack not found.</p>
        <Link href="/repacks" className="text-[var(--green)] text-sm mt-2 inline-block">Back to repacks</Link>
      </div>
    );
  }

  const totalCostCents = items.reduce(
    (sum, i) => sum + (i.cards?.estimated_value_cents || 0),
    0
  );
  const existingCardIds = items.map((i) => i.card_id);
  const isSold = repack.status === "sold";
  const profitCents = isSold && repack.sold_price_cents != null
    ? repack.sold_price_cents - totalCostCents
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Repacks", href: "/repacks" }, { label: repack.name }]} />
        <div className="flex items-center justify-between mt-1 gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{repack.name}</h1>
              {isSold && (
                <span className="inline-flex px-2 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full bg-blue-900/30 text-blue-400">
                  Sold
                </span>
              )}
              {repack.is_template && (
                <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--bg-card-hover)] text-[var(--text-muted)]">
                  Template
                </span>
              )}
            </div>
            {repack.description && (
              <p className="text-sm text-[var(--text-muted)] mt-1">{repack.description}</p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isSold && !repack.is_template && (
              <>
                <button
                  onClick={() => setShowPicker(true)}
                  className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-card-hover)] cursor-pointer"
                >
                  Add Cards
                </button>
                <button
                  onClick={() => setShowSellModal(true)}
                  disabled={items.length === 0}
                  className="px-4 py-2 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg text-sm font-semibold hover:bg-[var(--green-hover)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={items.length === 0 ? "Add cards before selling" : "Record a sale"}
                >
                  Mark as Sold
                </button>
              </>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Sold summary — only when the repack has been sold */}
      {isSold && repack.sold_price_cents != null && (
        <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-5">
          <p className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
            Sale Recorded
          </p>
          <div className="mt-2 grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">Sold For</p>
              <p className="font-[family-name:var(--font-bebas-neue)] text-3xl text-[var(--green)] tracking-wide mt-1">
                {formatCurrency(repack.sold_price_cents)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">Card Cost Basis</p>
              <p className="font-[family-name:var(--font-bebas-neue)] text-3xl text-[var(--text-primary)] tracking-wide mt-1">
                {formatCurrency(totalCostCents)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-muted)]">Profit</p>
              <p
                className={`font-[family-name:var(--font-bebas-neue)] text-3xl tracking-wide mt-1 ${
                  (profitCents ?? 0) >= 0 ? "text-[var(--green)]" : "text-red-500"
                }`}
              >
                {(profitCents ?? 0) >= 0 ? "+" : ""}
                {formatCurrency(Math.abs(profitCents ?? 0))}
              </p>
            </div>
          </div>
          {repack.sold_at && (
            <p className="text-xs text-[var(--text-muted)] text-center mt-3">
              Sold on {formatDate(repack.sold_at)}
            </p>
          )}
        </div>
      )}

      {/* Progress — hide when sold since target is irrelevant */}
      {!isSold && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)]">Progress</h3>
            <span className="text-sm text-[var(--text-muted)]">
              {items.length}{repack.target_items ? ` / ${repack.target_items}` : ""} cards
            </span>
          </div>
          {(repack.target_cost_cents || repack.ceiling_cost_cents || repack.floor_cost_cents) && (
            <CostIndicator
              currentCents={totalCostCents}
              floorCents={repack.floor_cost_cents}
              targetCents={repack.target_cost_cents}
              ceilingCents={repack.ceiling_cost_cents}
            />
          )}
        </div>
      )}

      {/* Cards */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-primary)]">
            Cards ({items.length})
          </h3>
        </div>
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-muted)] text-sm">No cards added yet.</p>
            {!isSold && (
              <button
                onClick={() => setShowPicker(true)}
                className="mt-3 text-sm text-[var(--green)] font-medium cursor-pointer"
              >
                Add cards from your inventory
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const card = item.cards;
              const primaryImage = card?.card_images?.find((img) => img.is_primary);
              return (
                <div key={item.id} className="flex items-center gap-3 px-6 py-3">
                  {primaryImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={primaryImage.url} alt="" className="w-10 h-14 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-14 bg-[var(--bg-card-hover)] rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {getCardTitle(card)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">{card?.sport || "Unknown"}</p>
                  </div>
                  {card?.grade_value && (
                    <GradeBadge grade={card.grade_value} size="sm" />
                  )}
                  <span className="text-sm font-medium text-[var(--text-secondary)]">
                    {formatCurrency(card?.estimated_value_cents)}
                  </span>
                  {!isSold && (
                    <button
                      onClick={() => handleRemoveCard(item.card_id)}
                      className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CardPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onSelect={handleAddCards}
        excludeCardIds={existingCardIds}
        currentRepackId={id}
      />

      {/* Mark as Sold modal */}
      {showSellModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Mark Repack as Sold</h2>
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                Sale Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]"
              />
            </div>
            <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 text-xs text-[var(--text-secondary)]">
              {items.length} card{items.length === 1 ? "" : "s"} will be marked as <strong>sold</strong> and removed from your active inventory. This action can&apos;t be undone from the UI.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowSellModal(false);
                  setSellPrice("");
                }}
                className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSell}
                disabled={selling || !sellPrice || parseFloat(sellPrice) <= 0}
                className="px-4 py-2 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg text-sm font-semibold hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
              >
                {selling ? "Recording..." : "Mark as Sold"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete repack?"
        message={
          isSold
            ? `"${repack.name}" will be permanently removed. Cards inside stay marked as sold.`
            : `"${repack.name}" will be permanently removed. The cards inside will remain in your inventory.`
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
