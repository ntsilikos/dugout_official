"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Card } from "@/lib/types";
import { formatCurrency, formatDate, getCardTitle } from "@/lib/utils";
import GradeBadge from "@/app/components/GradeBadge";
import GradeBreakdown from "@/app/components/GradeBreakdown";
import CreateListingModal from "@/app/components/listings/CreateListingModal";
import PriceComps from "@/app/components/inventory/PriceComps";
import AuthenticityResult from "@/app/components/inventory/AuthenticityResult";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Breadcrumb from "@/app/components/ui/Breadcrumb";

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showListingModal, setShowListingModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/cards/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCard(data.card || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
    router.push("/inventory");
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-[var(--bg-card-hover)] rounded w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="aspect-[2.5/3.5] bg-[var(--bg-card-hover)] rounded-xl" />
          <div className="space-y-4">
            <div className="h-24 w-24 bg-[var(--bg-card-hover)] rounded-full mx-auto" />
            <div className="h-6 bg-[var(--bg-card-hover)] rounded w-48 mx-auto" />
            <div className="h-20 bg-[var(--bg-card-hover)] rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Card not found.</p>
        <Link href="/inventory" className="text-[var(--green)] text-sm mt-2 inline-block">
          Back to inventory
        </Link>
      </div>
    );
  }

  const primaryImage = card.images?.find((img) => img.is_primary);
  const aiGrade = card.ai_identification as Record<string, unknown> | null;
  const subGrades =
    aiGrade?.subGrades && Array.isArray(aiGrade.subGrades)
      ? (aiGrade.subGrades as { category: "centering" | "corners" | "edges" | "surface"; score: number; notes: string }[])
      : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Breadcrumb items={[{ label: "Inventory", href: "/inventory" }, { label: getCardTitle(card) }]} />
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {card.status === "in_collection" && (
              <button
                onClick={() => setShowListingModal(true)}
                className="px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] transition-colors cursor-pointer whitespace-nowrap"
              >
                List on Marketplace
              </button>
            )}
            {card.status === "listed" && (
              <span className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium whitespace-nowrap">
                Listed
              </span>
            )}
            <Link
              href={`/inventory/${card.id}/edit`}
              className="px-4 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)] transition-colors whitespace-nowrap"
            >
              Edit
            </Link>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-2 break-words">
          {getCardTitle(card)}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          {primaryImage?.url ? (
            <img
              src={primaryImage.url}
              alt={getCardTitle(card)}
              className="w-full rounded-xl shadow-lg"
            />
          ) : (
            <div className="aspect-[2.5/3.5] bg-[var(--bg-card-hover)] rounded-xl flex items-center justify-center text-[var(--text-muted)]">
              <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {card.grade_value && (
            <div className="flex flex-col items-center text-center gap-2">
              <GradeBadge grade={card.grade_value} size="lg" />
              <div>
                <p className="text-xl font-bold text-[var(--text-primary)]">{card.grade_label}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {card.grade_company} {card.grade_value}
                </p>
              </div>
            </div>
          )}

          <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-3">
            {[
              { label: "Player", value: card.player_name },
              { label: "Year", value: card.year },
              { label: "Brand", value: card.brand },
              { label: "Set", value: card.set_name },
              { label: "Card #", value: card.card_number },
              { label: "Variant", value: card.variant },
              { label: "Sport", value: card.sport },
              { label: "Condition", value: card.condition === "graded" ? "Graded" : "Raw" },
              { label: "Est. Value", value: formatCurrency(card.estimated_value_cents) },
              { label: "Purchase Price", value: formatCurrency(card.purchase_price_cents) },
              { label: "Added", value: formatDate(card.created_at) },
            ]
              .filter((row) => row.value && row.value !== "N/A")
              .map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{row.label}</span>
                  <span className="font-medium text-[var(--text-primary)]">{row.value}</span>
                </div>
              ))}
          </div>

          {card.notes && (
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm">
              <p className="text-sm text-[var(--text-secondary)]">{card.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Market Price */}
      <PriceComps cardId={card.id} />

      {/* Authenticity Check */}
      <AuthenticityResult cardId={card.id} hasImage={!!primaryImage?.url} />

      {/* AI Grade Breakdown */}
      {subGrades && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">AI Grade Breakdown</h2>
          <GradeBreakdown subGrades={subGrades} />
          {typeof aiGrade?.explanation === "string" && (
            <p className="text-sm text-[var(--text-secondary)]">
              {aiGrade.explanation}
            </p>
          )}
        </div>
      )}

      <CreateListingModal
        cardId={card.id}
        isOpen={showListingModal}
        onClose={() => setShowListingModal(false)}
        onSuccess={() => {
          setShowListingModal(false);
          setCard({ ...card, status: "listed" as const });
        }}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete card?"
        message={`"${getCardTitle(card)}" will be permanently removed from your inventory. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
