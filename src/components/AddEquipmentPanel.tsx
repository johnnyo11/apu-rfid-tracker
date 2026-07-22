"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StatusToast from "@/components/StatusToast";
import { EQUIPMENT_STATUS } from "@/lib/status";
import type { EventFormOption } from "@/types/database";

type Message = { type: "success" | "error"; text: string };

const fieldClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const equipmentTypes = [
  "Mixer",
  "Amplifier",
  "Speaker",
  "Lighting",
  "Stand",
  "Mic. Receiver",
  "Misc",
] as const;

export default function AddEquipmentPanel({
  locations,
}: {
  locations: EventFormOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase is not configured." });
      return;
    }

    const form = new FormData(formElement);
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const category = String(form.get("category") ?? "").trim();
    const subcategory = String(form.get("subcategory") ?? "").trim();
    const thresholdValue = String(form.get("used_threshold") ?? "").trim();
    const threshold = thresholdValue ? Number(thresholdValue) : null;

    if (!code || !category || !subcategory) {
      setMessage({
        type: "error",
        text: "Equipment code, type, and subcategory are required.",
      });
      return;
    }
    if (threshold !== null && (!Number.isFinite(threshold) || threshold <= 0)) {
      setMessage({
        type: "error",
        text: "The maintenance threshold must be greater than zero hours.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data: duplicate, error: lookupError } = await supabase
      .from("equipment")
      .select("id")
      .ilike("code", code)
      .limit(1);
    if (lookupError) {
      setSaving(false);
      setMessage({ type: "error", text: lookupError.message });
      return;
    }
    if (duplicate?.length) {
      setSaving(false);
      setMessage({
        type: "error",
        text: `Equipment code ${code} is already in use.`,
      });
      return;
    }

    const text = (name: string) =>
      String(form.get(name) ?? "").trim() || null;
    const locationValue = String(form.get("location_id") ?? "").trim();
    const costValue = String(form.get("purchase_cost") ?? "").trim();

    const { error } = await supabase.from("equipment").insert({
      code,
      category,
      subcategory,
      brand: text("brand"),
      model: text("model"),
      serial_number: text("serial_number"),
      condition_when_received: text("condition_when_received"),
      current_condition: String(form.get("current_condition") ?? "good"),
      acquired_at: text("acquired_at"),
      invoice_number: text("invoice_number"),
      purchase_cost: costValue ? Number(costValue) : null,
      warranty_end_date: text("warranty_end_date"),
      status: String(form.get("status") ?? EQUIPMENT_STATUS.AVAILABLE),
      location_id: locationValue ? Number(locationValue) : null,
      notes: text("notes"),
      total_hours_used: 0,
      used_threshold: threshold,
    });

    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    formElement.reset();
    setMessage({
      type: "success",
      text: `${code} was added to the equipment inventory.`,
    });
    router.refresh();
  }

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Equipment records</h2>
          <p className="mt-1 text-sm text-slate-500">
            Register equipment before assigning an RFID tag or event.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setMessage(null);
          }}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span aria-hidden="true">{open ? "−" : "+"}</span>
          {open ? "Close form" : "New equipment"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Add new equipment
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the identifying and operational information first.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Equipment code <span className="text-red-600">*</span>
              <input name="code" required placeholder="e.g. AMP0003" className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Equipment type <span className="text-red-600">*</span>
              <select
                name="category"
                required
                defaultValue=""
                className={fieldClass}
              >
                <option value="" disabled>
                  Select equipment type
                </option>
                {equipmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Subcategory <span className="text-red-600">*</span>
              <input name="subcategory" required placeholder="e.g. Power Amplifier" className={fieldClass} />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Current condition
              <select name="current_condition" defaultValue="good" className={fieldClass}>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="inspection_required">Inspection required</option>
                <option value="damaged">Damaged</option>
                <option value="unusable">Unusable</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Operational status
              <select name="status" defaultValue={EQUIPMENT_STATUS.AVAILABLE} className={fieldClass}>
                <option value={EQUIPMENT_STATUS.AVAILABLE}>Available</option>
                <option value={EQUIPMENT_STATUS.UNDER_MAINTENANCE}>Under maintenance</option>
                <option value={EQUIPMENT_STATUS.RETIRED}>Retired</option>
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Current location
              <select name="location_id" defaultValue="" className={fieldClass}>
                <option value="">Not assigned</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.label}{location.detail ? ` — ${location.detail}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Maintenance threshold (hours)
              <input name="used_threshold" type="number" min="0.1" step="0.1" placeholder="e.g. 100" className={fieldClass} />
            </label>
          </div>

          <details className="mt-6 rounded-lg border border-slate-200">
            <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
              Additional identification and purchasing details
            </summary>
            <div className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">Brand<input name="brand" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700">Model<input name="model" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700">Serial number<input name="serial_number" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700">Condition when received<input name="condition_when_received" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700">Date acquired<input name="acquired_at" type="date" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700">Invoice number<input name="invoice_number" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700">Purchase cost<input name="purchase_cost" type="number" min="0" step="0.01" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700">Warranty end date<input name="warranty_end_date" type="date" className={fieldClass} /></label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-3">Notes<textarea name="notes" rows={3} className={fieldClass} /></label>
            </div>
          </details>

          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
              {saving ? "Adding equipment…" : "Add equipment"}
            </button>
          </div>
        </form>
      )}

      {message && (
        <StatusToast message={message.text} tone={message.type} onDismiss={() => setMessage(null)} />
      )}
    </section>
  );
}
