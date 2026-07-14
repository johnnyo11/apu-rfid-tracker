import EquipmentList from "@/components/EquipmentList";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Equipment } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EquipmentPage() {
  if (!isSupabaseConfigured || !supabase) {
    return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-bold text-slate-900">Equipment</h1><div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><h2 className="font-semibold">Supabase setup required</h2><p className="mt-2 text-sm">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to a .env.local file, then restart the development server.</p></div></div></main>;
  }

  const { data, error } = await supabase
    .from("equipment")
    .select("id, code, category, subcategory, brand, model, serial_number, condition_when_received, current_condition, acquired_at, invoice_number, purchase_cost, warranty_end_date, status, location_id, location:locations(id, name, type, level, location_detail), notes, created_at, updated_at, is_tagged")
    .order("code", { ascending: true });
  if (error) throw new Error(`Could not load equipment: ${error.message}`);
  const equipment: Equipment[] = (data ?? []).map((item) => ({
    ...item,
    location: Array.isArray(item.location)
      ? (item.location[0] ?? null)
      : item.location,
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl">
      <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Inventory management</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Equipment</h1><p className="mt-2 text-slate-600">View the status, condition, and location of AV equipment.</p>
      {equipment.length === 0 ? <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">No equipment found</h2><p className="mt-2 text-sm text-slate-500">Add a record to the equipment table in Supabase to see it here.</p></div> : <EquipmentList equipment={equipment} />}
    </div></main>
  );
}
