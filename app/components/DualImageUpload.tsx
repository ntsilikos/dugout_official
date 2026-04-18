"use client";

import { useState, useRef, useCallback } from "react";

export interface ImageData {
  base64: string;
  mediaType: string;
  previewUrl: string;
}

interface DualImageUploadProps {
  onImagesReady: (front: ImageData, back: ImageData | null) => void;
  disabled?: boolean;
}

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

interface SlotProps {
  label: string;
  helper: string;
  image: ImageData | null;
  onSelect: (data: ImageData) => void;
  onClear: () => void;
  disabled?: boolean;
}

function UploadSlot({ label, helper, image, onSelect, onClear, disabled }: SlotProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = useCallback(
    async (file: File) => {
      setError(null);
      const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validTypes.includes(file.type)) {
        setError("Use JPEG, PNG, WebP, or GIF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Image must be under 10MB");
        return;
      }
      try {
        const resized = await resizeImage(file, 1568);
        const base64 = await blobToBase64(resized);
        const previewUrl = URL.createObjectURL(file);
        onSelect({ base64, mediaType: file.type, previewUrl });
      } catch {
        setError("Failed to process image");
      }
    },
    [onSelect]
  );

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
        {image && !disabled && (
          <button
            onClick={onClear}
            className="text-xs text-[var(--text-muted)] hover:text-red-500 cursor-pointer"
          >
            Remove
          </button>
        )}
      </div>
      <div
        className={`relative border-2 border-dashed rounded-xl aspect-[5/7] flex items-center justify-center cursor-pointer transition-all overflow-hidden ${
          dragging
            ? "border-[var(--green)] bg-[var(--bg-green-glow)]"
            : image
              ? "border-[var(--green)]/40 bg-[var(--bg-card)]"
              : "border-[var(--border-strong)] hover:border-[var(--green)] hover:bg-[var(--bg-card)]"
        } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file) process(file);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) process(file);
          }}
          disabled={disabled}
        />
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image.previewUrl}
            alt={label}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center px-4">
            <svg
              className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <p className="text-sm font-medium text-[var(--text-secondary)]">{helper}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Click or drop</p>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}

export default function DualImageUpload({ onImagesReady, disabled }: DualImageUploadProps) {
  const [front, setFront] = useState<ImageData | null>(null);
  const [back, setBack] = useState<ImageData | null>(null);

  const handleFront = useCallback(
    (data: ImageData) => {
      setFront(data);
      onImagesReady(data, back);
    },
    [back, onImagesReady]
  );

  const handleBack = useCallback(
    (data: ImageData) => {
      setBack(data);
      if (front) onImagesReady(front, data);
    },
    [front, onImagesReady]
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        <UploadSlot
          label="Front"
          helper="Upload front photo"
          image={front}
          onSelect={handleFront}
          onClear={() => setFront(null)}
          disabled={disabled}
        />
        <UploadSlot
          label="Back (optional)"
          helper="Upload back photo"
          image={back}
          onSelect={handleBack}
          onClear={() => setBack(null)}
          disabled={disabled}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center">
        Adding the back photo dramatically improves year/set identification
      </p>
    </div>
  );
}
