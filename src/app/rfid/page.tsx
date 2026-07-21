import RfidAssignmentPanel from "@/components/RfidAssignmentPanel";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isManagerRole } from "@/lib/auth/roles";
import type { RfidAssignment } from "@/types/database";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function RfidPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-slate-900">RFID tags</h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Configure Supabase to manage RFID assignments.
          </p>
        </div>
      </main>
    );
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/rfid");

  const { data: profile, error: profileError } = await supabase
    .from("part_timer")
    .select("role, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (profileError) {
    throw new Error(`Could not verify RFID access: ${profileError.message}`);
  }
  if (
    !profile ||
    String(profile.status ?? "").trim().toLowerCase() !== "active" ||
    !isManagerRole(profile.role)
  ) {
    redirect("/operations?access=rfid_denied");
  }

  const [tagResult, equipmentResult] = await Promise.all([
    supabase
      .from("rfid_tags")
      .select(
        "tagged_id, tag_code, tag_uid, status, tagged_at, equipment:equipment(id, code, subcategory)",
      )
      .order("tagged_at", { ascending: false }),
    supabase
      .from("equipment")
      .select("id, code, subcategory, status")
      .order("code"),
  ]);

  const missingUidColumn = Boolean(
    tagResult.error &&
      (tagResult.error.code === "42703" ||
        tagResult.error.code === "PGRST204" ||
        tagResult.error.message.toLowerCase().includes("tag_uid")),
  );
  const schemaReady = !missingUidColumn;
  let assignments: RfidAssignment[] = [];

  if (!tagResult.error) {
    assignments = (tagResult.data ?? []).map((item) => ({
      ...item,
      equipment: one(item.equipment),
    }));
  } else if (missingUidColumn) {
    const { data, error } = await supabase
      .from("rfid_tags")
      .select(
        "tagged_id, tag_code, status, tagged_at, equipment:equipment(id, code, subcategory)",
      )
      .order("tagged_at", { ascending: false });
    if (error) {
      throw new Error(`Could not load RFID assignments: ${error.message}`);
    }
    assignments = (data ?? []).map((item) => ({
      ...item,
      tag_uid: null,
      equipment: one(item.equipment),
    }));
  } else {
    throw new Error(`Could not load RFID assignments: ${tagResult.error.message}`);
  }

  if (equipmentResult.error) {
    throw new Error(
      `Could not load equipment for RFID assignment: ${equipmentResult.error.message}`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          RFID management
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">RFID tags</h1>
        <p className="mt-2 text-slate-600">
          Pair physical RC522 tag UIDs with registered equipment.
        </p>
        <RfidAssignmentPanel
          schemaReady={schemaReady}
          schemaError={missingUidColumn ? tagResult.error?.message : null}
          assignments={assignments}
          equipmentOptions={(equipmentResult.data ?? []).map((item) => ({
            id: item.id,
            label: item.code ?? `EQ-${item.id}`,
            detail: `${item.subcategory ?? "Equipment"} · ${item.status ?? "available"}`,
          }))}
        />
      </div>
    </main>
  );
}
