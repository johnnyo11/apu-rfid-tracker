"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StatusToast from "@/components/StatusToast";
import type {
  EventFormOption,
  MaintenanceActivity,
} from "@/types/database";

const label = (value: string) => value.replaceAll("_", " ");
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-MY", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "Not recorded";

export default function MaintenanceList({
  logs,
  equipmentOptions,
}: {
  logs: MaintenanceActivity[];
  equipmentOptions: EventFormOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [saving, setSaving] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const statuses = useMemo(
    () => [...new Set(logs.map((item) => item.status))].sort(),
    [logs],
  );
  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((item) => {
      const text = [
        item.equipment?.code,
        item.equipment?.subcategory,
        item.issue_description,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        text.includes(term) && (status === "all" || item.status === status)
      );
    });
  }, [logs, search, status]);

  async function reportIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!supabase) return;
    const form = new FormData(formElement);
    const equipmentId = Number(form.get("equipment_id"));
    const issueDescription = String(
      form.get("issue_description") ?? "",
    ).trim();
    if (!equipmentId || !issueDescription) {
      setMessage({
        type: "error",
        text: "Select equipment and describe the issue.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    const { error: logError } = await supabase
      .from("maintenance_logs")
      .insert({
        equipment_id: equipmentId,
        issue_description: issueDescription,
        status: "reported",
        reported_at: new Date().toISOString(),
        notes: String(form.get("notes") ?? "").trim() || null,
      });

    if (logError) {
      setSaving(false);
      setMessage({ type: "error", text: logError.message });
      return;
    }

    const { error: equipmentError } = await supabase
      .from("equipment")
      .update({ status: "under_maintenance" })
      .eq("id", equipmentId);

    setSaving(false);
    setMessage(
      equipmentError
        ? {
            type: "error",
            text: `Issue recorded, but equipment status was not updated: ${equipmentError.message}`,
          }
        : { type: "success", text: "Maintenance issue recorded." },
    );
    formElement.reset();
    router.refresh();
  }

  async function resolveMaintenance(item: MaintenanceActivity) {
    if (!supabase || !item.equipment) return;
    setResolvingId(item.id);
    setMessage(null);
    const resolvedAt = new Date().toISOString();
    const { error: logError } = await supabase
      .from("maintenance_logs")
      .update({
        status: "resolved",
        serviced_at: item.serviced_at ?? resolvedAt,
        resolved_at: resolvedAt,
      })
      .eq("id", item.id);

    if (logError) {
      setResolvingId(null);
      setMessage({ type: "error", text: logError.message });
      return;
    }

    const { error: equipmentError } = await supabase
      .from("equipment")
      .update({
        status: "available",
        total_hours_used: 0,
      })
      .eq("id", item.equipment.id);

    setResolvingId(null);
    setMessage(
      equipmentError
        ? {
            type: "error",
            text: `Maintenance was resolved, but usage hours were not reset: ${equipmentError.message}`,
          }
        : {
            type: "success",
            text: `${item.equipment.code} is available and its usage hours were reset.`,
          },
    );
    router.refresh();
  }

  const resolved = logs.filter((item) => item.status === "resolved").length;
  const openCount = logs.length - resolved;

  return (
    <section className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Maintenance records", logs.length],
          ["Open issues", openCount],
          ["Completed trips", resolved],
        ].map(([name, value]) => (
          <div
            key={name}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">{name}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setMessage(null);
          }}
          aria-expanded={open}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <span>
            <span className="block font-semibold text-slate-900">
              Report an equipment issue
            </span>
            <span className="mt-1 block text-sm text-slate-500">
              Create a maintenance record and flag the equipment for inspection.
            </span>
          </span>
          <span className="text-2xl text-blue-600" aria-hidden="true">
            {open ? "−" : "+"}
          </span>
        </button>
        {open && (
          <form
            onSubmit={reportIssue}
            className="border-t border-slate-200 p-5"
          >
            <div className="grid gap-4 md:grid-cols-2">
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
                Issue description
                <input
                  name="issue_description"
                  required
                  placeholder="e.g. unusual fan noise"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Notes
                <textarea
                  name="notes"
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? "Recording..." : "Report issue"}
              </button>
            </div>
          </form>
        )}
      </div>

      {message && (
        <StatusToast
          message={message.text}
          tone={message.type}
          onDismiss={() => setMessage(null)}
        />
      )}

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search equipment or issue..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 space-y-3">
        {results.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-bold text-slate-900">
                  {item.equipment?.code ?? "Unknown equipment"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {item.equipment?.subcategory ?? "Equipment"} · Reported{" "}
                  {formatDate(item.reported_at)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                  item.status === "resolved"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {label(item.status)}
              </span>
            </div>
            <p className="mt-4 text-sm text-slate-700">
              {item.issue_description || "No issue description provided."}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">
                Serviced: {formatDate(item.serviced_at)} · Resolved:{" "}
                {formatDate(item.resolved_at)}
              </p>
              {item.status !== "resolved" && item.equipment && (
                <button
                  type="button"
                  onClick={() => resolveMaintenance(item)}
                  disabled={resolvingId === item.id}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {resolvingId === item.id
                    ? "Resolving..."
                    : "Resolve maintenance"}
                </button>
              )}
            </div>
          </article>
        ))}
        {!results.length && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-semibold text-slate-800">
              No matching maintenance records
            </h2>
          </div>
        )}
      </div>
    </section>
  );
}
