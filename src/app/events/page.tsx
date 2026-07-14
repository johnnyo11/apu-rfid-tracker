import EventList from "@/components/EventList";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import type { Event } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  if (!isSupabaseConfigured || !supabase) return <main className="min-h-screen bg-slate-50 px-6 py-10"><div className="mx-auto max-w-6xl"><h1 className="text-3xl font-bold text-slate-900">Events</h1><p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">Configure Supabase to view events.</p></div></main>;
  const { data, error } = await supabase.from("events").select("id, event_name, event_description, pic_user_id, location_id, event_start_time, event_end_time, status, created_at, pic:part_timer(id, student_id, name), location:locations(id, name)").order("event_start_time");
  if (error) throw new Error(`Could not load events: ${error.message}`);
  const events: Event[] = (data ?? []).map((event) => ({ ...event, pic: Array.isArray(event.pic) ? (event.pic[0] ?? null) : event.pic, location: Array.isArray(event.location) ? (event.location[0] ?? null) : event.location }));
  return <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10"><div className="mx-auto max-w-6xl"><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Event operations</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Events</h1><p className="mt-2 text-slate-600">Plan upcoming work and see who is responsible at each location.</p>{events.length ? <EventList events={events} /> : <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">No events found</h2><p className="mt-2 text-sm text-slate-500">Add an event in Supabase to begin planning.</p></div>}</div></main>;
}
