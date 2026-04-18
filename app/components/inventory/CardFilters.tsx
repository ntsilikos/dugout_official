"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SPORTS = ["Baseball", "Basketball", "Football", "Hockey", "Soccer"];
const STATUSES = [
  { value: "in_collection", label: "In Collection" },
  { value: "listed", label: "Listed" },
  { value: "sold", label: "Sold" },
];

export default function CardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/inventory?${params.toString()}`);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Search cards..."
          defaultValue={searchParams.get("q") || ""}
          onChange={(e) => updateParam("q", e.target.value)}
          className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] outline-none"
        />
      </div>
      <select
        defaultValue={searchParams.get("sport") || ""}
        onChange={(e) => updateParam("sport", e.target.value)}
        className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
      >
        <option value="">All Sports</option>
        {SPORTS.map((sport) => (
          <option key={sport} value={sport}>{sport}</option>
        ))}
      </select>
      <select
        defaultValue={searchParams.get("status") || ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-secondary)] bg-[var(--bg-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
      >
        <option value="">All Statuses</option>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}
