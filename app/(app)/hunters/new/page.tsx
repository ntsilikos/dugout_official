"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SearchForm, { type SearchFilters } from "@/app/components/hunters/SearchForm";
import Breadcrumb from "@/app/components/ui/Breadcrumb";

export default function NewSearchPage() {
  const router = useRouter();

  const handleSubmit = async (data: {
    name: string;
    filters: SearchFilters;
    max_price_cents: number | null;
  }) => {
    const res = await fetch("/api/hunters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.search) {
      // Auto-run the first search
      await fetch(`/api/hunters/${result.search.id}/run`, { method: "POST" });
      router.push(`/hunters/${result.search.id}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Card Hunter", href: "/hunters" }, { label: "New Search" }]} />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">
          Create New Search
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Set at least 2 filters. We&apos;ll notify you when matching cards appear.
        </p>
      </div>

      <SearchForm onSubmit={handleSubmit} />
    </div>
  );
}
