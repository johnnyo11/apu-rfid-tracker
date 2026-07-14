import PartTimerList from "@/app/part_timer/PartTimerList";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { User } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function PartTimerPage() {
  if (!isSupabaseConfigured || !supabase) return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-5xl"><h1 className="text-3xl font-bold text-slate-900">Users</h1><p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">Add the Supabase environment variables, then restart the development server.</p></div></main>;
  const { data, error } = await supabase
    .from("part_timer")
    .select("id, student_id, date_of_birth, role, name, email, phone, status")
    .order("name");
  if (error) throw new Error(`Could not load users: ${error.message}`);
  const users: User[] = (data ?? []).map((user) => ({
    id: user.id,
    user_code: user.student_id,
    full_name: user.name,
    role: user.role,
    birthdate: user.date_of_birth,
    email: user.email,
    phone: user.phone === null ? null : String(user.phone),
    status: user.status,
    profile_image_url: null,
  }));
  return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-5xl"><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Team management</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Part-timers</h1><p className="mt-2 text-slate-600">View AV part-time team members and their roles.</p>{users.length ? <PartTimerList users={users} /> : <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">No part-timers found</h2><p className="mt-2 text-sm text-slate-500">Add a record to the part_timer table in Supabase.</p></div>}</div></main>;
}
