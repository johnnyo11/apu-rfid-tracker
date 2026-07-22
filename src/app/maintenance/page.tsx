import MaintenanceList from "@/components/MaintenanceList";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeStatus } from "@/lib/status";
import type { MaintenanceActivity } from "@/types/database";

export const dynamic = "force-dynamic";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function MaintenancePage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-slate-900">Maintenance</h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Configure Supabase to view maintenance records.
          </p>
        </div>
      </main>
    );
  }
  const supabase = await createClient();

  const [logsResult, equipmentResult] = await Promise.all([
    supabase
      .from("maintenance_logs")
      .select(
        "id, equipment_id, issue_description, status, reported_at, serviced_at, resolved_at, notes, equipment:equipment(id, code, subcategory, total_hours_used, used_threshold)",
      )
      .order("reported_at", { ascending: false }),
    supabase
      .from("equipment")
      .select("id, code, subcategory, status, total_hours_used, used_threshold")
      .order("code"),
  ]);

  if (logsResult.error) {
    throw new Error(
      `Could not load maintenance records: ${logsResult.error.message}`,
    );
  }
  if (equipmentResult.error) {
    throw new Error(
      `Could not load equipment for maintenance: ${equipmentResult.error.message}`,
    );
  }

  const logs: MaintenanceActivity[] = (logsResult.data ?? []).map((item) => ({
    ...item,
    status: normalizeStatus(item.status, "reported"),
    reported_at: item.reported_at ?? new Date(0).toISOString(),
    equipment: one(item.equipment),
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Equipment lifecycle
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Maintenance</h1>
        <p className="mt-2 text-slate-600">
          Report anomalies, resolve maintenance, and reset usage hours after
          servicing.
        </p>
        <MaintenanceList
          logs={logs}
          equipmentOptions={(equipmentResult.data ?? []).map((item) => ({
            id: item.id,
            label: item.code ?? `EQ-${item.id}`,
            detail: `${item.subcategory ?? "Equipment"} · ${Number(item.total_hours_used ?? 0).toFixed(1)} hours`,
          }))}
        />
      </div>
    </main>
  );
}
