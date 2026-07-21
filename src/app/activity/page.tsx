import ScanActivityList from "@/components/ScanActivityList";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { ScanActivity } from "@/types/database";

export const dynamic = "force-dynamic";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function ActivityPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-slate-900">
            Movement history
          </h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Configure Supabase to view movement history.
          </p>
        </div>
      </main>
    );
  }
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("scan_logs")
    .select(
      "id, movement_type, scanned_at, rfid_tag:rfid_tags(tagged_id, equipment:equipment(id, code, subcategory))",
    )
    .order("scanned_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load movement history: ${error.message}`);
  }

  const scans: ScanActivity[] = (data ?? []).map((row) => {
    const tag = one(row.rfid_tag);
    return {
      id: row.id,
      movement_type: row.movement_type,
      scanned_at: row.scanned_at,
      equipment: tag ? one(tag.equipment) : null,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          RFID operations
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Movement history
        </h1>
        <p className="mt-2 text-slate-600">
          Review accepted RFID checkout and check-in movements.
        </p>
        <ScanActivityList scans={scans} />
      </div>
    </main>
  );
}
