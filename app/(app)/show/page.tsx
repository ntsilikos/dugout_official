"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Show {
  id: string;
  name: string;
  location: string | null;
  status: string;
  created_at: string;
}

export default function ShowModePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [starting, setStarting] = useState(false);
  const [pastShows, setPastShows] = useState<Show[]>([]);

  useEffect(() => {
    fetch("/api/shows")
      .then((res) => res.json())
      .then((data) => setPastShows(data.shows || []))
      .catch(() => {});
  }, []);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setStarting(true);
    const res = await fetch("/api/shows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, location: location || null }),
    });
    const data = await res.json();
    if (data.show) {
      router.push(`/show/${data.show.id}`);
    }
    setStarting(false);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 pt-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Live Show Mode</h1>
        <p className="text-[var(--text-secondary)] mt-2">Quick scan and sell at card shows and events</p>
      </div>

      <form onSubmit={handleStart} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Show Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
            placeholder="e.g. National Card Show 2026"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
            placeholder="e.g. Atlantic City Convention Center"
          />
        </div>
        <button
          type="submit"
          disabled={starting || !name}
          className="w-full py-3 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 cursor-pointer"
        >
          Start Show
        </button>
      </form>

      {pastShows.length > 0 && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Past Shows</h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {pastShows.map((show) => (
              <Link
                key={show.id}
                href={`/show/${show.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-primary)]"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{show.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {show.location && `${show.location} · `}
                    {formatDate(show.created_at)}
                  </p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  show.status === "active" ? "bg-green-100 text-green-700" : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                }`}>
                  {show.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
