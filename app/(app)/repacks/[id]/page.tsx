"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import { formatCurrency, getCardTitle } from "@/lib/utils";
import GradeBadge from "@/app/components/GradeBadge";
import CostIndicator from "@/app/components/repacks/CostIndicator";
import CardPicker from "@/app/components/repacks/CardPicker";

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
}

export default function RepackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [repack, setRepack] = useState<Repack | null>(null);
  const [items, setItems] = useState<RepackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    await fetch(`/api/repacks/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_ids: cardIds }),
    });
    fetchData();
  };

  const handleRemoveCard = async (cardId: string) => {
    await fetch(`/api/repacks/${id}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId }),
    });
    setItems((prev) => prev.filter((i) => i.card_id !== cardId));
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await fetch(`/api/repacks/${id}`, { method: "DELETE" });
    router.push("/repacks");
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Repacks", href: "/repacks" }, { label: repack.name }]} />
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{repack.name}</h1>
            {repack.description && (
              <p className="text-sm text-[var(--text-muted)] mt-1">{repack.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPicker(true)}
              className="px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] cursor-pointer"
            >
              Add Cards
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
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
            <button
              onClick={() => setShowPicker(true)}
              className="mt-3 text-sm text-[var(--green)] font-medium cursor-pointer"
            >
              Add cards from your inventory
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const card = item.cards;
              const primaryImage = card?.card_images?.find((img) => img.is_primary);
              return (
                <div key={item.id} className="flex items-center gap-3 px-6 py-3">
                  {primaryImage?.url ? (
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
                  <button
                    onClick={() => handleRemoveCard(item.card_id)}
                    className="text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
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
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete repack?"
        message={`"${repack?.name}" will be permanently removed. The cards inside will return to your inventory.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
