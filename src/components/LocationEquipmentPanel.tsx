"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import StatusToast from "@/components/StatusToast";
import { supabase } from "@/lib/supabaseClient";
import type { AvailableLocationEquipment, Location } from "@/types/database";

export default function LocationEquipmentPanel({
  location,
  equipment,
  onClose,
}: {
  location: Location;
  equipment: AvailableLocationEquipment[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const choices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return equipment
      .filter((item) => item.location_id !== location.id)
      .filter((item) =>
        [item.code, item.category, item.subcategory, item.location_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
  }, [equipment, location.id, search]);

  function toggle(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function assignEquipment() {
    if (!supabase || selectedIds.length === 0) return;
    setSaving(true);
    setMessage(null);
    const { data, error } = await supabase
      .from("equipment")
      .update({ location_id: location.id, updated_at: new Date().toISOString() })
      .in("id", selectedIds)
      .ilike("status", "available")
      .select("id");
    setSaving(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    if (!data || data.length !== selectedIds.length) {
      setMessage({
        type: "error",
        text: "Some equipment could not be moved. Check its current status and your update permission.",
      });
      router.refresh();
      return;
    }

    setSelectedIds([]);
    setMessage({
      type: "success",
      text: `${data.length} ${data.length === 1 ? "item was" : "items were"} assigned to ${location.name}.`,
    });
    router.refresh();
    window.setTimeout(onClose, 900);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-equipment-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Assign available equipment</p>
            <h2 id="location-equipment-title" className="mt-1 text-xl font-bold text-slate-900">{location.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Items currently stored elsewhere will be moved here.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close equipment panel" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">&times;</button>
        </div>

        <div className="min-h-0 overflow-y-auto p-5">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search available equipment..." aria-label="Search available equipment" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <p className="mt-3 text-sm text-slate-500">{choices.length} available {choices.length === 1 ? "item" : "items"}</p>
          {choices.length ? (
            <div className="mt-3 space-y-2">
              {choices.map((item) => {
                const checked = selectedIds.includes(item.id);
                return (
                  <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${checked ? "border-blue-400 bg-blue-50" : "border-slate-200 hover:bg-slate-50"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(item.id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-slate-900">{item.code}</span>
                      <span className="block truncate text-sm text-slate-500">{item.subcategory || item.category || "Equipment"}</span>
                    </span>
                    <span className="max-w-40 text-right text-xs text-slate-500">{item.location_name ? `Currently: ${item.location_name}` : "Not assigned"}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-semibold text-slate-800">No available equipment found</p>
              <p className="mt-1 text-sm text-slate-500">Equipment already here or in another operational state is not shown.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5">
          <p className="text-sm font-medium text-slate-600">{selectedIds.length} selected</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="button" onClick={assignEquipment} disabled={saving || selectedIds.length === 0} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Assigning..." : "Assign equipment"}</button>
          </div>
        </div>
      </div>
      {message && <StatusToast message={message.text} tone={message.type} onDismiss={() => setMessage(null)} />}
    </div>
  );
}
