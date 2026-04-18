"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Card } from "@/lib/types";
import { getCardTitle } from "@/lib/utils";
import CardForm, { type CardFormData } from "@/app/components/inventory/CardForm";
import Breadcrumb from "@/app/components/ui/Breadcrumb";

export default function EditCardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/cards/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCard(data.card || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

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
      estimated_value_cents: formData.estimated_value_cents
        ? parseInt(formData.estimated_value_cents)
        : null,
      purchase_price_cents: formData.purchase_price_cents
        ? parseInt(formData.purchase_price_cents)
        : null,
      notes: formData.notes || null,
    };

    await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    router.push(`/inventory/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto animate-pulse space-y-6">
        <div className="h-8 bg-[var(--bg-card-hover)] rounded w-48" />
        <div className="h-64 bg-[var(--bg-card-hover)] rounded-xl" />
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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Inventory", href: "/inventory" },
            { label: getCardTitle(card), href: `/inventory/${id}` },
            { label: "Edit" },
          ]}
        />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
          Edit: {getCardTitle(card)}
        </h1>
      </div>

      <CardForm
        initialData={{
          player_name: card.player_name || "",
          year: card.year ? String(card.year) : "",
          brand: card.brand || "",
          set_name: card.set_name || "",
          card_number: card.card_number || "",
          variant: card.variant || "",
          sport: card.sport || "",
          condition: card.condition,
          grade_company: card.grade_company || "",
          grade_value: card.grade_value ? String(card.grade_value) : "",
          estimated_value_cents: card.estimated_value_cents
            ? String(card.estimated_value_cents)
            : "",
          purchase_price_cents: card.purchase_price_cents
            ? String(card.purchase_price_cents)
            : "",
          notes: card.notes || "",
        }}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />
    </div>
  );
}
