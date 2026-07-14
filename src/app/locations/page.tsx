import AddLocationPanel from "@/components/AddLocationPanel";
import LocationList from "@/components/LocationList";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Location } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  if (!isSupabaseConfigured || !supabase) return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-bold text-slate-900">Locations</h1><p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">Add the Supabase environment variables, then restart the development server.</p></div></main>;
  const { data, error } = await supabase.from("locations").select("id, name, type, block, level, location_detail, equipment(id)").order("name");
  if (error) throw new Error(`Could not load locations: ${error.message}`);
  const locations = (data ?? []) as Location[];
  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Inventory management</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Locations</h1><p className="mt-2 text-slate-600">See where equipment is stored or deployed.</p><AddLocationPanel />{locations.length ? <LocationList locations={locations} /> : <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">No locations found</h2><p className="mt-2 text-sm text-slate-500">Use the panel above to add your first location.</p></div>}</div></main>;
}
