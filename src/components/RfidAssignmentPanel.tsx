"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StatusToast from "@/components/StatusToast";
import type {
  EventFormOption,
  RfidAssignment,
} from "@/types/database";

function normalizeUid(value: string) {
  return value.replace(/[^0-9a-f]/gi, "").toUpperCase();
}

function nextTagCode(assignments: RfidAssignment[]) {
  const greatestNumber = assignments.reduce((greatest, assignment) => {
    const match = assignment.tag_code?.match(/^TAG-(\d+)$/i);
    const value = match ? Number(match[1]) : assignment.tagged_id;
    return Number.isFinite(value) ? Math.max(greatest, value) : greatest;
  }, 0);
  return `TAG-${String(greatestNumber + 1).padStart(3, "0")}`;
}

export default function RfidAssignmentPanel({
  schemaReady,
  schemaError,
  assignments,
  equipmentOptions,
}: {
  schemaReady: boolean;
  schemaError?: string | null;
  assignments: RfidAssignment[];
  equipmentOptions: EventFormOption[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function assignTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!supabase || !schemaReady) return;
    const form = new FormData(formElement);
    const equipmentId = Number(form.get("equipment_id"));
    const uid = normalizeUid(String(form.get("tag_uid") ?? ""));
    const tagCode = nextTagCode(assignments);
    if (!equipmentId || !uid) {
      setMessage({
        type: "error",
        text: "Select equipment and provide a valid hexadecimal UID.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    const { data: existingUid, error: lookupError } = await supabase
      .from("rfid_tags")
      .select("tagged_id")
      .eq("tag_uid", uid)
      .maybeSingle();

    if (lookupError) {
      setSaving(false);
      setMessage({ type: "error", text: lookupError.message });
      return;
    }
    if (existingUid) {
      setSaving(false);
      setMessage({
        type: "error",
        text: "This RFID UID is already registered.",
      });
      return;
    }

    const activeAssignment = assignments.find(
      (item) => item.equipment?.id === equipmentId && item.status === "active",
    );
    if (activeAssignment) {
      setSaving(false);
      setMessage({
        type: "error",
        text: "This equipment already has an active RFID tag.",
      });
      return;
    }

    const { error } = await supabase.from("rfid_tags").insert({
      tag_code: tagCode,
      tag_uid: uid,
      assigned_equipment_id: equipmentId,
      status: "active",
    });
    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    formElement.reset();
    setMessage({
      type: "success",
      text: `${tagCode} was assigned successfully. Attach this label to the physical tag.`,
    });
    router.refresh();
  }

  return (
    <section className="mt-8">
      {!schemaReady ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h2 className="font-bold">RFID UID column required</h2>
          <p className="mt-2 text-sm">
            Add a unique text column named <code>tag_uid</code> to{" "}
            <code>rfid_tags</code>. This assignment form will become available
            automatically afterward.
          </p>
          {schemaError && (
            <p className="mt-3 rounded-lg border border-amber-300 bg-white/60 p-3 text-xs">
              Database response: {schemaError}
            </p>
          )}
          <pre className="mt-4 overflow-x-auto rounded-lg bg-amber-100 p-3 text-xs">
            <code>
              alter table public.rfid_tags add column tag_uid text unique;
            </code>
          </pre>
        </div>
      ) : (
        <form
          onSubmit={assignTag}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <h2 className="font-bold text-slate-900">Assign an RFID tag</h2>
            <p className="mt-1 text-sm text-slate-500">
              Select equipment and enter the hexadecimal UID read by the RC522.
              A human-readable tag label will be generated automatically.
            </p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="text-sm font-medium text-slate-700">
              Equipment
              <select
                name="equipment_id"
                required
                defaultValue=""
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              >
                <option value="" disabled>
                  Select equipment
                </option>
                {equipmentOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} — {item.detail}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Tag UID
              <input
                name="tag_uid"
                required
                placeholder="e.g. 04A17F2C"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-mono font-normal uppercase"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Assigning..." : "Assign tag"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-bold text-slate-900">RFID assignments</h2>
          <p className="mt-1 text-sm text-slate-500">
            {assignments.length} tag assignment
            {assignments.length === 1 ? "" : "s"} recorded
          </p>
        </div>
        {assignments.length ? (
          <div className="divide-y divide-slate-100">
            {assignments.map((item) => (
              <div
                key={item.tagged_id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                    {item.tag_code ??
                      `TAG-${String(item.tagged_id).padStart(3, "0")}`}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {item.equipment?.code ?? "Unmatched equipment"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.equipment?.subcategory ?? "Equipment"}
                    {item.tag_uid ? ` · UID ${item.tag_uid}` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                    item.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.status ?? "unassigned"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-slate-500">
            No RFID assignments found.
          </p>
        )}
      </div>
      {message && (
        <StatusToast
          message={message.text}
          tone={message.type}
          onDismiss={() => setMessage(null)}
        />
      )}
    </section>
  );
}
