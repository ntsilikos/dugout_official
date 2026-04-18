"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency, formatDate, getCardTitle } from "@/lib/utils";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import Breadcrumb from "@/app/components/ui/Breadcrumb";

interface ConsignorDetail {
  id: string;
  name: string;
  email: string | null;
  commission_rate: number;
}

interface ConsignmentItem {
  id: string;
  status: string;
  cards: { player_name: string | null; year: number | null; brand: string | null; set_name: string | null; estimated_value_cents: number | null };
}

interface Payout {
  id: string;
  amount_cents: number;
  notes: string | null;
  paid_at: string;
}

export default function ConsignorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [consignor, setConsignor] = useState<ConsignorDetail | null>(null);
  const [items, setItems] = useState<ConsignmentItem[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPayout, setShowPayout] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch(`/api/consignors/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setConsignor(data.consignor || null);
        setItems(data.items || []);
        setPayouts(data.payouts || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handlePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaying(true);
    const res = await fetch(`/api/consignors/${id}/payout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_cents: Math.round(parseFloat(payoutAmount) * 100),
        notes: payoutNotes || null,
      }),
    });
    const data = await res.json();
    if (data.payout) {
      setPayouts((prev) => [data.payout, ...prev]);
      setShowPayout(false);
      setPayoutAmount("");
      setPayoutNotes("");
    }
    setPaying(false);
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    await fetch(`/api/consignors/${id}`, { method: "DELETE" });
    router.push("/consignment");
  };

  if (loading) return <div className="max-w-3xl mx-auto animate-pulse"><div className="h-8 bg-[var(--bg-card-hover)] rounded w-48" /></div>;

  if (!consignor) return <div className="text-center py-12"><p className="text-[var(--text-muted)]">Not found.</p><Link href="/consignment" className="text-[var(--green)] text-sm">Back</Link></div>;

  const totalPaid = payouts.reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Consignment", href: "/consignment" }, { label: consignor.name }]} />
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{consignor.name}</h1>
            <p className="text-sm text-[var(--text-muted)]">{consignor.email} · {consignor.commission_rate}% commission</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowPayout(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer">
              Record Payout
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer">
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm text-center">
          <p className="text-sm text-[var(--text-muted)]">Active Cards</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{items.filter((i) => i.status === "active").length}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm text-center">
          <p className="text-sm text-[var(--text-muted)]">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm text-center">
          <p className="text-sm text-[var(--text-muted)]">Sold</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">{items.filter((i) => i.status === "sold").length}</p>
        </div>
      </div>

      {/* Cards */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Consigned Cards ({items.length})</h3>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No cards assigned to this consignor yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{getCardTitle(item.cards)}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatCurrency(item.cards.estimated_value_cents)}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  item.status === "active" ? "bg-green-100 text-green-700" :
                  item.status === "sold" ? "bg-blue-100 text-blue-700" : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payouts */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Payout History</h3>
        </div>
        {payouts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No payouts recorded yet.</p>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{formatCurrency(p.amount_cents)}</p>
                  {p.notes && <p className="text-xs text-[var(--text-muted)]">{p.notes}</p>}
                </div>
                <span className="text-xs text-[var(--text-muted)]">{formatDate(p.paid_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout modal */}
      {showPayout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handlePayout} className="bg-[var(--bg-card)] rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Record Payout</h2>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Amount ($)</label>
              <input type="number" step="0.01" min="0" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} required className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--green)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Notes</label>
              <input type="text" value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[var(--green)]" placeholder="Optional" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPayout(false)} className="flex-1 py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg font-medium cursor-pointer">Cancel</button>
              <button type="submit" disabled={paying} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50 cursor-pointer">{paying ? "Saving..." : "Record"}</button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Delete consignor?"
        message={`"${consignor?.name}" and all associated records (items, payouts) will be permanently removed. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
