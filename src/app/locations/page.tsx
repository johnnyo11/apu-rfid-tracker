import AddLocationPanel from "@/components/AddLocationPanel";
import LocationList from "@/components/LocationList";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AvailableLocationEquipment, Location } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  if (!isSupabaseConfigured) return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-bold text-slate-900">Locations</h1><p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">Add the Supabase environment variables, then restart the development server.</p></div></main>;
  const supabase = await createClient();
  const [locationsResult, equipmentResult] = await Promise.all([
    supabase.from("locations").select("id, name, type, block, level, location_detail, equipment(id)").order("name"),
    supabase.from("equipment").select("id, code, category, subcategory, status, location_id, location:locations(name)").order("code"),
  ]);
  if (locationsResult.error) throw new Error(`Could not load locations: ${locationsResult.error.message}`);
  if (equipmentResult.error) throw new Error(`Could not load available equipment: ${equipmentResult.error.message}`);

  const locations = (locationsResult.data ?? []) as Location[];
  const availableEquipment: AvailableLocationEquipment[] = (equipmentResult.data ?? [])
    .filter((item) => String(item.status ?? "").trim().toLowerCase() === "available")
    .map((item) => {
      const itemLocation = Array.isArray(item.location) ? (item.location[0] ?? null) : item.location;
      return {
        id: item.id,
        code: item.code ?? `EQ-${item.id}`,
        category: item.category,
        subcategory: item.subcategory,
        location_id: item.location_id,
        location_name: itemLocation?.name ?? null,
      };
    });

  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Inventory management</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Locations</h1><p className="mt-2 text-slate-600">See where equipment is stored or deployed.</p><AddLocationPanel />{locations.length ? <LocationList locations={locations} availableEquipment={availableEquipment} /> : <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">No locations found</h2><p className="mt-2 text-sm text-slate-500">Use the panel above to add your first location.</p></div>}</div></main>;
}
