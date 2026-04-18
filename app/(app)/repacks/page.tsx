"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Repack {
  id: string;
  name: string;
  description: string | null;
  target_items: number | null;
  target_cost_cents: number | null;
  status: string;
  is_template: boolean;
  sold_price_cents: number | null;
  sold_at: string | null;
  created_at: string;
  repack_items: { count: number }[];
}

const TABS = [
  { key: "active", label: "Repacks" },
  { key: "templates", label: "Templates" },
  { key: "sold", label: "Sold" },
];

function RepacksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "active";
  const [repacks, setRepacks] = useState<Repack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/repacks?tab=${tab}`)
      .then((res) => res.json())
      .then((data) => {
        setRepacks(data.repacks || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tab]);

  const handleDuplicate = async (templateId: string) => {
    const res = await fetch(`/api/repacks/${templateId}/duplicate`, {
      method: "POST",
    });
    const data = await res.json();
    if (data.repack) {
      router.push(`/repacks/${data.repack.id}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">REPACKS</h1>
        <Link
          href="/repacks/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-card-hover)] p-1 rounded-lg w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.push(`/repacks?tab=${t.key}`)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              tab === t.key
                ? "bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 animate-pulse">
              <div className="h-5 bg-[var(--bg-card-hover)] rounded w-48" />
            </div>
          ))}
        </div>
      ) : repacks.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {tab === "templates" ? "No templates yet" : tab === "sold" ? "No sold repacks" : "No repacks yet"}
          </h2>
          <Link
            href="/repacks/new"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] transition-colors mt-4"
          >
            Create Your First Repack
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {repacks.map((repack) => {
            const itemCount = repack.repack_items?.[0]?.count || 0;
            return (
              <div
                key={repack.id}
                className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <Link href={`/repacks/${repack.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[var(--text-primary)] hover:text-[var(--green)] transition-colors">
                        {repack.name}
                      </h3>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        repack.status === "sold"
                          ? "bg-blue-100 text-blue-700"
                          : repack.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                      }`}>
                        {repack.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      {itemCount}{repack.target_items ? ` / ${repack.target_items}` : ""} cards
                      {repack.target_cost_cents && ` · Target: ${formatCurrency(repack.target_cost_cents)}`}
                      {repack.sold_price_cents && ` · Sold: ${formatCurrency(repack.sold_price_cents)}`}
                      {repack.sold_at && ` on ${formatDate(repack.sold_at)}`}
                    </p>
                  </Link>
                  {repack.is_template && (
                    <button
                      onClick={() => handleDuplicate(repack.id)}
                      className="px-3 py-1.5 border border-[var(--green)/30] text-[var(--green)] rounded-lg text-xs font-medium hover:bg-[var(--bg-green-glow)] cursor-pointer"
                    >
                      Use Template
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RepacksPage() {
  return (
    <Suspense>
      <RepacksContent />
    </Suspense>
  );
}
