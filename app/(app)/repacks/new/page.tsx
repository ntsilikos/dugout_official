"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/ui/Breadcrumb";
import { useToast } from "@/app/components/ui/Toast";

export default function NewRepackPage() {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetItems, setTargetItems] = useState("");
  const [targetCost, setTargetCost] = useState("");
  const [ceilingCost, setCeilingCost] = useState("");
  const [floorCost, setFloorCost] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Client-side cost validation so the user sees problems immediately
  const costError = useMemo(() => {
    const floor = floorCost ? parseFloat(floorCost) : null;
    const target = targetCost ? parseFloat(targetCost) : null;
    const ceiling = ceilingCost ? parseFloat(ceilingCost) : null;
    if (floor != null && target != null && floor > target) {
      return "Floor cost can't be higher than target cost.";
    }
    if (target != null && ceiling != null && target > ceiling) {
      return "Target cost can't be higher than ceiling cost.";
    }
    if (floor != null && ceiling != null && floor > ceiling) {
      return "Floor cost can't be higher than ceiling cost.";
    }
    return null;
  }, [floorCost, targetCost, ceilingCost]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (costError) {
      toast.error(costError);
      return;
    }
    setSaving(true);

    try {
      const res = await fetch("/api/repacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          target_items: targetItems ? parseInt(targetItems) : null,
          target_cost_cents: targetCost ? Math.round(parseFloat(targetCost) * 100) : null,
          ceiling_cost_cents: ceilingCost ? Math.round(parseFloat(ceilingCost) * 100) : null,
          floor_cost_cents: floorCost ? Math.round(parseFloat(floorCost) * 100) : null,
          is_template: isTemplate,
        }),
      });

      const data = await res.json();
      if (data.repack) {
        router.push(`/repacks/${data.repack.id}`);
      } else {
        toast.error(data.error || "Failed to create repack");
        setSaving(false);
      }
    } catch {
      toast.error("Couldn't reach the server");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Breadcrumb items={[{ label: "Repacks", href: "/repacks" }, { label: "New Repack" }]} />
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mt-1">Create Repack</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Repack Details</h3>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Repack Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
              placeholder="e.g. Mystery Box #1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none resize-none"
              placeholder="Optional description..."
            />
          </div>
        </div>

        <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Cost Targets</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Optional. Set a <strong>floor</strong> (min cost you&apos;ll accept), <strong>target</strong> (what
              you aim for), and <strong>ceiling</strong> (max cost). The detail page will show a live
              progress bar as you add cards.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Target # of Items</label>
              <input
                type="number"
                min="0"
                value={targetItems}
                onChange={(e) => setTargetItems(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Floor Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={floorCost}
                onChange={(e) => setFloorCost(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="$0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Target Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={targetCost}
                onChange={(e) => setTargetCost(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="$0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Ceiling Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={ceilingCost}
                onChange={(e) => setCeilingCost(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-strong)] rounded-lg text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--green)] outline-none"
                placeholder="$0"
              />
            </div>
          </div>
          {costError && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-400">{costError}</p>
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isTemplate}
            onChange={(e) => setIsTemplate(e.target.checked)}
            className="w-4 h-4 text-[var(--green)] rounded"
          />
          <span className="text-sm text-[var(--text-secondary)]">Save as Template</span>
        </label>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !name || !!costError}
            className="px-6 py-2.5 bg-[var(--green)] text-white rounded-lg font-medium hover:bg-[var(--green-hover)] disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Creating..." : "Create Repack"}
          </button>
        </div>
      </form>
    </div>
  );
}
