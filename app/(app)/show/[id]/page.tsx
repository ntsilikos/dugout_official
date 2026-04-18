"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import ImageUpload from "@/app/components/ImageUpload";

interface Sale {
  id: string;
  card_name: string;
  price_cents: number;
  sold_at: string;
}

interface Show {
  id: string;
  name: string;
  location: string | null;
  status: string;
}

export default function ShowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [show, setShow] = useState<Show | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickPrice, setQuickPrice] = useState("");
  const [quickName, setQuickName] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetch(`/api/shows/${id}/sales`)
      .then((res) => res.json())
      .then((data) => {
        setShow(data.show || null);
        setSales(data.sales || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const totalSales = sales.reduce((sum, s) => sum + s.price_cents, 0);

  const handleQuickSell = async () => {
    if (!quickName || !quickPrice) return;
    const priceCents = Math.round(parseFloat(quickPrice) * 100);
    const res = await fetch(`/api/shows/${id}/sales`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_name: quickName, price_cents: priceCents }),
    });
    const data = await res.json();
    if (data.sale) {
      setSales((prev) => [data.sale, ...prev]);
    }
    setQuickName("");
    setQuickPrice("");
  };

  const handleScanSell = async (data: { base64: string; mediaType: string }) => {
    setScanning(true);
    try {
      const res = await fetch("/api/cards/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data.base64, mediaType: data.mediaType }),
      });
      const result = await res.json();
      if (result.success && result.result) {
        setQuickName(result.result.cardIdentification || "Unknown Card");
        setShowScanner(false);
      }
    } catch {
      // Ignore
    } finally {
      setScanning(false);
    }
  };

  const handleEndShow = async () => {
    await fetch(`/api/shows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ended" }),
    });
    setShow((prev) => prev ? { ...prev, status: "ended" } : prev);
  };

  if (loading) {
    return <div className="max-w-lg mx-auto animate-pulse pt-4"><div className="h-8 bg-[var(--bg-card-hover)] rounded w-48" /></div>;
  }

  if (!show) {
    return <div className="text-center py-12"><p className="text-[var(--text-muted)]">Show not found.</p><Link href="/show" className="text-[var(--green)] text-sm">Back</Link></div>;
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/show" className="text-xs text-[var(--text-muted)]">&larr; Exit Show</Link>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{show.name}</h1>
          {show.location && <p className="text-xs text-[var(--text-muted)]">{show.location}</p>}
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-[var(--text-muted)]">{sales.length} sales</p>
        </div>
      </div>

      {/* Quick Sell */}
      {show.status === "active" && (
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">Quick Sell</h3>
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="text-xs text-[var(--green)] font-medium cursor-pointer"
            >
              {showScanner ? "Manual entry" : "Scan card"}
            </button>
          </div>

          {showScanner && (
            <div>
              <ImageUpload onImageSelect={(data) => handleScanSell(data)} disabled={scanning} />
              {scanning && <p className="text-xs text-[var(--green)] text-center mt-2">Identifying card...</p>}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              className="flex-1 px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="Card name"
            />
            <input
              type="number"
              step="0.01"
              value={quickPrice}
              onChange={(e) => setQuickPrice(e.target.value)}
              className="w-24 px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="$"
            />
            <button
              onClick={handleQuickSell}
              disabled={!quickName || !quickPrice}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 cursor-pointer"
            >
              Sell
            </button>
          </div>
        </div>
      )}

      {show.status === "active" && (
        <button
          onClick={handleEndShow}
          className="w-full py-2 border border-[var(--border-strong)] text-[var(--text-secondary)] rounded-lg text-sm font-medium hover:bg-[var(--bg-primary)] cursor-pointer"
        >
          End Show
        </button>
      )}

      {show.status === "ended" && (
        <div className="bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg p-3 text-center text-sm text-[var(--text-secondary)]">
          Show ended · {sales.length} total sales · {formatCurrency(totalSales)}
        </div>
      )}

      {/* Sales Log */}
      <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text-primary)] text-sm">Sales Log</h3>
        </div>
        {sales.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No sales yet. Start selling!</p>
        ) : (
          <div className="divide-y divide-[var(--border)] max-h-96 overflow-y-auto">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{sale.card_name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(sale.sold_at).toLocaleTimeString()}
                  </p>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency(sale.price_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
