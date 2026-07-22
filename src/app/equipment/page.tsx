import EquipmentList from "@/components/EquipmentList";
import AddEquipmentPanel from "@/components/AddEquipmentPanel";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeStatus } from "@/lib/status";
import type { Equipment } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  if (!isSupabaseConfigured) {
    return <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold text-slate-900">
          Equipment
        </h1>
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h2 className="font-semibold">
            Supabase setup required
          </h2>
          <p className="mt-2 text-sm">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to a .env.local file, then restart the development server.</p>
        </div>
      </div>
    </main>;
  }
  const supabase = await createClient();

  const [equipmentResult, locationsResult] = await Promise.all([
    supabase
      .from("equipment")
      .select(
        "id, code, category, subcategory, brand, model, serial_number, condition_when_received, current_condition, acquired_at, invoice_number, purchase_cost, warranty_end_date, status, location_id, location:locations(id, name, type, block, level, location_detail), notes, created_at, updated_at, total_hours_used, used_threshold, rfid_tags(tagged_id, status, tagged_at)",
      )
      .order("code", { ascending: true }),
    supabase.from("locations").select("id, name, block, level").order("name"),
  ]);

  if (equipmentResult.error) {
    throw new Error(`Could not load equipment: ${equipmentResult.error.message}`);
  }
  if (locationsResult.error) {
    throw new Error(`Could not load equipment locations: ${locationsResult.error.message}`);
  }
  const equipment: Equipment[] = (equipmentResult.data ?? []).map((item) => {
    const location = Array.isArray(item.location)
      ? (item.location[0] ?? null)
      : item.location;
    const activeTag =
      (item.rfid_tags ?? []).find((tag) => tag.status === "active") ?? null;
    const estimatedHours = Number(item.total_hours_used ?? 0);
    const threshold = item.used_threshold;
    const maintenanceState =
      threshold && estimatedHours >= threshold
        ? "inspection_due"
        : threshold && estimatedHours >= threshold * 0.8
          ? "inspection_soon"
          : "normal";

    return {
      ...item,
      code: item.code ?? `EQ-${item.id}`,
      category: item.category ?? "Uncategorised",
      subcategory: item.subcategory ?? "Equipment",
      current_condition: item.current_condition ?? "not_inspected",
      status: normalizeStatus(item.status, "available"),
      location,
      rfid_tag: activeTag,
      is_tagged: Boolean(activeTag),
      total_hours_used: estimatedHours,
      estimated_operating_hours: estimatedHours,
      maintenance_state: maintenanceState,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
        Inventory management
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        Equipment
      </h1>
      <p className="mt-2 text-slate-600">
        View the status, condition, and location of AV equipment.
      </p>
      <AddEquipmentPanel
        locations={(locationsResult.data ?? []).map((location) => ({
          id: location.id,
          label: location.name,
          detail: [location.block, location.level ? `Level ${location.level}` : null]
            .filter(Boolean)
            .join(" · "),
        }))}
      />
      {equipment.length === 0 ? 
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <h2 className="font-semibold text-slate-800">
          No equipment found
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Add a record to the equipment table in Supabase to see it here.
        </p>
      </div> : <EquipmentList equipment={equipment} />}
    </div>
    </main>
  );
}
