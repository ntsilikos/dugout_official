"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface Consignor {
  id: string;
  name: string;
  email: string | null;
  commission_rate: number;
  active_cards: number;
  total_paid_cents: number;
}

export default function ConsignmentPage() {
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRate, setFormRate] = useState("15");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch("/api/consignors")
      .then((res) => res.json())
      .then((data) => { setConsignors(data.consignors || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/consignors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        email: formEmail || null,
        commission_rate: parseFloat(formRate) || 15,
      }),
    });
    const data = await res.json();
    if (data.consignor) {
      setConsignors((prev) => [{ ...data.consignor, active_cards: 0, total_paid_cents: 0 }, ...prev]);
      setShowCreate(false);
      setFormName(""); setFormEmail(""); setFormRate("15");
    }
    setCreating(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl tracking-wider text-[var(--text-primary)]">CONSIGNMENT</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--green)] text-white rounded-lg text-sm font-medium hover:bg-[var(--green-hover)] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Consignor
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreate} className="bg-[var(--bg-card)] rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">New Consignor</h2>
              <button type="button" onClick={() => setShowCreate(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required placeholder="Name" className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]" />
            <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Email (optional)" className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]" />
            <div>
              <label className="block text-xs text-[var(--text-secondary)] mb-1">Commission Rate (%)</label>
              <input type="number" step="0.5" min="0" max="100" value={formRate} onChange={(e) => setFormRate(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--green)]" />
            </div>
            <button type="submit" disabled={creating || !formName} className="w-full py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer">
              {creating ? "Creating..." : "Add Consignor"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 animate-pulse"><div className="h-5 bg-[var(--bg-card-hover)] rounded w-48" /></div>
          ))}
        </div>
      ) : consignors.length === 0 ? (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-12 text-center shadow-sm">
          <svg className="w-16 h-16 mx-auto text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Track consigned cards</h2>
          <p className="text-[var(--text-secondary)] mb-6">Manage cards owned by others with automatic commission tracking.</p>
          <button onClick={() => setShowCreate(true)} className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] cursor-pointer">
            Add First Consignor
          </button>
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Name</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Cards</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Rate</th>
                <th className="px-4 py-3 text-xs font-medium text-[var(--text-muted)] uppercase">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {consignors.map((c) => (
                <tr key={c.id} className="hover:bg-[var(--bg-primary)]">
                  <td className="px-4 py-3">
                    <Link href={`/consignment/${c.id}`} className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--green)]">
                      {c.name}
                    </Link>
                    {c.email && <p className="text-xs text-[var(--text-muted)]">{c.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{c.active_cards}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{c.commission_rate}%</td>
                  <td className="px-4 py-3 text-sm font-medium text-[var(--text-primary)]">{formatCurrency(c.total_paid_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
