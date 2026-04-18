"use client";

import { useState, useRef, useCallback } from "react";
import type { ScanResult } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import GradeBadge from "@/app/components/GradeBadge";

type ItemStatus =
  | "pending"
  | "scanning"
  | "scanned"
  | "saving"
  | "saved"
  | "error"
  | "skipped";

interface QueueItem {
  id: string;
  file: File;
  previewUrl: string;
  base64?: string;
  mediaType: string;
  backFile?: File;
  backPreviewUrl?: string;
  backBase64?: string;
  backMediaType?: string;
  status: ItemStatus;
  result?: ScanResult;
  error?: string;
  savedCardId?: string;
}

const MAX_CONCURRENT_SCANS = 3;

function resizeImage(file: File, maxDimension: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }
      const scale = maxDimension / Math.max(width, height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context failed"));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Resize failed"))),
        file.type,
        0.9
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = URL.createObjectURL(file);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(blob);
  });
}

function getPSALabel(grade: number): string {
  const labels: Record<number, string> = {
    10: "Gem Mint",
    9: "Mint",
    8: "Near Mint-Mint",
    7: "Near Mint",
    6: "Excellent-Mint",
    5: "Excellent",
    4: "Very Good-Excellent",
    3: "Very Good",
    2: "Good",
    1: "Poor",
  };
  return labels[Math.round(grade)] || "";
}

interface BulkScanProps {
  onComplete?: () => void;
}

export default function BulkScan({ onComplete }: BulkScanProps) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const updateItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const updateResult = useCallback(
    (id: string, patch: Partial<ScanResult>) => {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id && q.result
            ? { ...q, result: { ...q.result, ...patch } }
            : q
        )
      );
    },
    []
  );

  const prepareImage = async (file: File) => {
    const resized = await resizeImage(file, 1568);
    const base64 = await blobToBase64(resized);
    return { base64, mediaType: file.type };
  };

  const processFile = useCallback(
    async (item: QueueItem) => {
      try {
        updateItem(item.id, { status: "scanning" });
        // Pre-cache base64 if not already
        const front = item.base64
          ? { base64: item.base64, mediaType: item.mediaType }
          : await prepareImage(item.file);
        const back = item.backFile
          ? item.backBase64
            ? { base64: item.backBase64, mediaType: item.backMediaType! }
            : await prepareImage(item.backFile)
          : null;

        updateItem(item.id, {
          base64: front.base64,
          ...(back
            ? { backBase64: back.base64, backMediaType: back.mediaType }
            : {}),
        });

        const res = await fetch("/api/cards/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: front.base64,
            mediaType: front.mediaType,
            backImage: back?.base64,
            backMediaType: back?.mediaType,
          }),
        });
        const data = await res.json();

        if (data.success && data.result) {
          updateItem(item.id, { status: "scanned", result: data.result });
        } else {
          updateItem(item.id, {
            status: "error",
            error: data.error || "Scan failed",
          });
        }
      } catch (e) {
        updateItem(item.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Processing failed",
        });
      }
    },
    [updateItem]
  );

  const processQueue = useCallback(
    async (items: QueueItem[]) => {
      const pending = [...items];
      const running: Promise<void>[] = [];

      const runNext = async (): Promise<void> => {
        const item = pending.shift();
        if (!item) return;
        await processFile(item);
        return runNext();
      };

      for (let i = 0; i < MAX_CONCURRENT_SCANS; i++) {
        running.push(runNext());
      }
      await Promise.all(running);
    },
    [processFile]
  );

  const addFiles = useCallback((files: File[]) => {
    const validFiles = files.filter((f) =>
      ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)
    );
    if (!validFiles.length) return;

    const newItems: QueueItem[] = validFiles.map((file) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      mediaType: file.type,
      status: "pending",
    }));

    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const attachBack = useCallback(
    (itemId: string, file: File) => {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) return;
      updateItem(itemId, {
        backFile: file,
        backPreviewUrl: URL.createObjectURL(file),
        backMediaType: file.type,
        backBase64: undefined,
      });
    },
    [updateItem]
  );

  const removeBack = useCallback(
    (itemId: string) => {
      updateItem(itemId, {
        backFile: undefined,
        backPreviewUrl: undefined,
        backMediaType: undefined,
        backBase64: undefined,
      });
    },
    [updateItem]
  );

  const removeItem = useCallback((itemId: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== itemId));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(Array.from(e.target.files));
      if (inputRef.current) inputRef.current.value = "";
    },
    [addFiles]
  );

  const handleStartScans = async () => {
    const toScan = queue.filter((q) => q.status === "pending");
    if (!toScan.length) return;
    setIsScanning(true);
    await processQueue(toScan);
    setIsScanning(false);
  };

  const handleSkip = (id: string) => {
    updateItem(id, { status: "skipped" });
  };

  const handleRetry = (item: QueueItem) => {
    void processFile(item);
  };

  const handleSave = async (item: QueueItem) => {
    if (!item.result || !item.base64) return;
    const r = item.result;
    updateItem(item.id, { status: "saving" });

    const chId = (r as unknown as Record<string, unknown>).cardhedgeCardId;
    const body: Record<string, unknown> = {
      player_name: r.playerName || null,
      year: r.year || null,
      brand: r.brand || null,
      set_name: r.setName || null,
      card_number: r.cardNumber || null,
      variant: r.variant || null,
      sport: r.sport || null,
      condition: "raw",
      grade_company: "AI",
      grade_value: r.overallGrade,
      grade_label: r.overallLabel || getPSALabel(r.overallGrade),
      estimated_value_cents: r.estimatedValueCents || null,
      status: "in_collection",
      ai_identification: r,
    };
    if (chId) body.cardhedge_card_id = chId;

    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.card) {
        // Upload front image in background
        fetch(`/api/cards/${data.card.id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: item.base64,
            mediaType: item.mediaType,
            side: "front",
          }),
        }).catch(() => {});
        // Upload back image if we have one
        if (item.backBase64 && item.backMediaType) {
          fetch(`/api/cards/${data.card.id}/images`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: item.backBase64,
              mediaType: item.backMediaType,
              side: "back",
            }),
          }).catch(() => {});
        }
        updateItem(item.id, { status: "saved", savedCardId: data.card.id });
      } else {
        updateItem(item.id, {
          status: "error",
          error: data.error || "Save failed",
        });
      }
    } catch {
      updateItem(item.id, { status: "error", error: "Save failed" });
    }
  };

  const handleSaveAll = async () => {
    const toSave = queue.filter((q) => q.status === "scanned");
    for (const item of toSave) {
      await handleSave(item);
    }
    onComplete?.();
  };

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const scanningCount = queue.filter((q) => q.status === "scanning").length;
  const scannedCount = queue.filter((q) => q.status === "scanned").length;
  const savedCount = queue.filter((q) => q.status === "saved").length;
  const errorCount = queue.filter((q) => q.status === "error").length;
  const skippedCount = queue.filter((q) => q.status === "skipped").length;

  const statusColors: Record<ItemStatus, string> = {
    pending: "bg-[var(--bg-card-hover)] text-[var(--text-muted)]",
    scanning: "bg-[var(--bg-green-glow)] text-[var(--green)]",
    scanned: "bg-[var(--bg-green-glow)] text-[var(--green)]",
    saving: "bg-[var(--bg-green-glow)] text-[var(--green)]",
    saved: "bg-green-900/30 text-green-400",
    error: "bg-red-900/30 text-red-400",
    skipped: "bg-[var(--bg-card-hover)] text-[var(--text-muted)]",
  };

  const statusLabels: Record<ItemStatus, string> = {
    pending: "Pending",
    scanning: "Scanning...",
    scanned: "Ready to review",
    saving: "Saving...",
    saved: "Saved",
    error: "Error",
    skipped: "Skipped",
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-[var(--green)] bg-[var(--bg-green-glow)] scale-[1.01]"
            : "border-[var(--border-strong)] hover:border-[var(--green)] hover:bg-[var(--bg-card)]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleFilePick}
        />
        <svg
          className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-base font-medium text-[var(--text-primary)]">
          {queue.length > 0 ? "Drop more photos" : "Drop card photos (fronts)"}
        </p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Click to browse. Add backs per-card below for better accuracy.
        </p>
      </div>

      {/* Status bar */}
      {queue.length > 0 && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-10">
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{queue.length}</span> total
            </span>
            {pendingCount > 0 && (
              <span className="text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{pendingCount}</span> ready to scan
              </span>
            )}
            {scanningCount > 0 && (
              <span className="text-[var(--green)]">
                <span className="font-semibold">{scanningCount}</span> scanning
              </span>
            )}
            {scannedCount > 0 && (
              <span className="text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{scannedCount}</span> ready to save
              </span>
            )}
            {savedCount > 0 && (
              <span className="text-green-500">
                <span className="font-semibold">{savedCount}</span> saved
              </span>
            )}
            {errorCount > 0 && (
              <span className="text-red-500">
                <span className="font-semibold">{errorCount}</span> errors
              </span>
            )}
            {skippedCount > 0 && (
              <span className="text-[var(--text-muted)]">
                <span className="font-semibold">{skippedCount}</span> skipped
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <button
                onClick={handleStartScans}
                disabled={isScanning}
                className="px-5 py-2 bg-[var(--green)] text-[var(--bg-primary)] rounded-lg text-sm font-semibold hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
              >
                {isScanning ? "Scanning..." : `Start Scans (${pendingCount})`}
              </button>
            )}
            {scannedCount > 0 && (
              <button
                onClick={handleSaveAll}
                className="px-5 py-2 border border-[var(--green)] text-[var(--green)] rounded-lg text-sm font-semibold hover:bg-[var(--bg-green-glow)] cursor-pointer"
              >
                Save All ({scannedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Queue list */}
      {queue.length > 0 && (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-4 flex gap-4 ${
                item.status === "saved" || item.status === "skipped"
                  ? "opacity-60"
                  : ""
              }`}
            >
              {/* Front thumbnail */}
              <div className="shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 text-center font-semibold">
                  Front
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className="w-20 h-28 object-cover rounded-lg"
                />
              </div>

              {/* Back thumbnail or Add Back button */}
              <div className="shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1 text-center font-semibold">
                  Back
                </p>
                {item.backPreviewUrl ? (
                  <div className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.backPreviewUrl}
                      alt=""
                      className="w-20 h-28 object-cover rounded-lg"
                    />
                    {item.status === "pending" && (
                      <button
                        onClick={() => removeBack(item.id)}
                        className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove back"
                      >
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      ref={(el) => {
                        backInputRefs.current[item.id] = el;
                      }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) attachBack(item.id, f);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => backInputRefs.current[item.id]?.click()}
                      disabled={item.status !== "pending"}
                      className="w-20 h-28 border-2 border-dashed border-[var(--border-strong)] rounded-lg flex flex-col items-center justify-center text-[var(--text-muted)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <span className="text-[10px] font-medium mt-1">Add Back</span>
                    </button>
                  </>
                )}
              </div>

              {/* Info + status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[item.status]}`}
                  >
                    {statusLabels[item.status]}
                  </span>
                  {item.result?.overallGrade && (
                    <GradeBadge grade={item.result.overallGrade} size="sm" />
                  )}
                </div>

                {item.status === "pending" && (
                  <p className="text-sm text-[var(--text-muted)]">
                    {item.backFile
                      ? "Ready with front + back"
                      : "Ready (back optional)"}
                  </p>
                )}

                {item.status === "scanning" && (
                  <p className="text-sm text-[var(--text-muted)]">
                    Identifying card...
                  </p>
                )}

                {item.status === "error" && (
                  <div>
                    <p className="text-sm text-red-400 mb-2">{item.error}</p>
                    <button
                      onClick={() => handleRetry(item)}
                      className="text-xs text-[var(--green)] font-medium cursor-pointer"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {item.result &&
                  (item.status === "scanned" ||
                    item.status === "saving" ||
                    item.status === "saved") &&
                  editingId !== item.id && (
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {[
                          item.result.year,
                          item.result.brand,
                          item.result.setName,
                          item.result.playerName,
                        ]
                          .filter(Boolean)
                          .join(" ") || "Unidentified card"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {[
                          item.result.sport,
                          item.result.variant,
                          item.result.cardNumber && `#${item.result.cardNumber}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {item.result.estimatedValueCents != null && (
                        <p className="text-sm font-semibold text-[var(--green)] mt-1">
                          {formatCurrency(item.result.estimatedValueCents)}
                        </p>
                      )}
                    </div>
                  )}

                {/* Inline edit form */}
                {item.result && editingId === item.id && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Player"
                      value={item.result.playerName || ""}
                      onChange={(e) => updateResult(item.id, { playerName: e.target.value })}
                      className="col-span-2 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--green)]"
                    />
                    <input
                      type="number"
                      placeholder="Year"
                      value={item.result.year || ""}
                      onChange={(e) => updateResult(item.id, { year: e.target.value ? parseInt(e.target.value) : null })}
                      className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--green)]"
                    />
                    <input
                      type="text"
                      placeholder="Brand"
                      value={item.result.brand || ""}
                      onChange={(e) => updateResult(item.id, { brand: e.target.value })}
                      className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--green)]"
                    />
                    <input
                      type="text"
                      placeholder="Set"
                      value={item.result.setName || ""}
                      onChange={(e) => updateResult(item.id, { setName: e.target.value })}
                      className="col-span-2 px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--green)]"
                    />
                    <input
                      type="text"
                      placeholder="Card #"
                      value={item.result.cardNumber || ""}
                      onChange={(e) => updateResult(item.id, { cardNumber: e.target.value })}
                      className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--green)]"
                    />
                    <input
                      type="text"
                      placeholder="Variant (Base)"
                      value={item.result.variant || ""}
                      onChange={(e) => updateResult(item.id, { variant: e.target.value })}
                      className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--green)]"
                    />
                    <select
                      value={item.result.sport || ""}
                      onChange={(e) => updateResult(item.id, { sport: e.target.value })}
                      className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-secondary)] outline-none focus:border-[var(--green)]"
                    >
                      <option value="">Sport</option>
                      <option value="Baseball">Baseball</option>
                      <option value="Basketball">Basketball</option>
                      <option value="Football">Football</option>
                      <option value="Hockey">Hockey</option>
                      <option value="Soccer">Soccer</option>
                      <option value="Pokemon">Pokemon</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Est. value ¢"
                      value={item.result.estimatedValueCents ?? ""}
                      onChange={(e) =>
                        updateResult(item.id, {
                          estimatedValueCents: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border-strong)] rounded text-[var(--text-primary)] outline-none focus:border-[var(--green)]"
                    />
                    <button
                      onClick={() => setEditingId(null)}
                      className="col-span-2 mt-1 px-3 py-1.5 bg-[var(--green)] text-[var(--bg-primary)] rounded font-semibold cursor-pointer"
                    >
                      Done Editing
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                {item.status === "pending" && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="px-3 py-1.5 border border-[var(--border-strong)] text-[var(--text-secondary)] text-xs font-medium rounded-md hover:bg-[var(--bg-card-hover)] cursor-pointer"
                  >
                    Remove
                  </button>
                )}
                {item.status === "scanned" && editingId !== item.id && (
                  <>
                    <button
                      onClick={() => handleSave(item)}
                      className="px-3 py-1.5 bg-[var(--green)] text-[var(--bg-primary)] text-xs font-semibold rounded-md hover:bg-[var(--green-hover)] cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(item.id)}
                      className="px-3 py-1.5 border border-[var(--border-strong)] text-[var(--text-secondary)] text-xs font-medium rounded-md hover:bg-[var(--bg-card-hover)] cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSkip(item.id)}
                      className="px-3 py-1.5 border border-[var(--border-strong)] text-[var(--text-secondary)] text-xs font-medium rounded-md hover:bg-[var(--bg-card-hover)] cursor-pointer"
                    >
                      Skip
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
