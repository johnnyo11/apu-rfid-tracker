import EventList from "@/components/EventList";
import CreateEventPanel from "@/components/CreateEventPanel";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeStatus } from "@/lib/status";
import type {
  Event,
  EventEquipment,
  EventLocation,
  EventResponsibleUser,
} from "@/types/database";

export const dynamic = "force-dynamic";

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function EventsPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-slate-900">Events</h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Configure Supabase to view events.
          </p>
        </div>
      </main>
    );
  }
  const supabase = await createClient();

  const [
    eventsResult,
    responsibleResult,
    locationsResult,
    equipmentResult,
    availableLocationsResult,
    availableEquipmentResult,
    availablePartTimersResult,
  ] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, event_name, event_description, organizer_name, organizer_contact, start_at, end_at, status, notes, created_at, updated_at",
        )
        .order("start_at"),
      supabase
        .from("part_timer_responsible")
        .select(
          "event_id, part_timer_id, part_timer:part_timer(id, student_id, name, role)",
        ),
      supabase
        .from("event_locations")
        .select(
          "id, event_id, is_main_location, location:locations(id, name, block, level)",
        ),
      supabase
        .from("event_requirement")
        .select(
          "event_id, equipment_id, location_id, equipment:equipment(id, code, subcategory, status, total_hours_used), event_location:event_locations(id, is_main_location, location:locations(id, name, block, level))",
        ),
      supabase
        .from("locations")
        .select("id, name, block, level")
        .order("name"),
      supabase
        .from("equipment")
        .select("id, code, subcategory, status")
        .order("code"),
      supabase
        .from("part_timer")
        .select("id, student_id, name, role, status")
        .order("name"),
    ]);

  const firstError = [
    eventsResult.error,
    responsibleResult.error,
    locationsResult.error,
    equipmentResult.error,
    availableLocationsResult.error,
    availableEquipmentResult.error,
    availablePartTimersResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error(`Could not load events: ${firstError.message}`);
  }

  const responsibleByEvent = new Map<number, EventResponsibleUser[]>();
  for (const row of responsibleResult.data ?? []) {
    const users = responsibleByEvent.get(row.event_id) ?? [];
    users.push({
      part_timer_id: row.part_timer_id,
      responsibility: null,
      part_timer: one(row.part_timer),
    });
    responsibleByEvent.set(row.event_id, users);
  }

  const locationsByEvent = new Map<number, EventLocation[]>();
  for (const row of locationsResult.data ?? []) {
    const locations = locationsByEvent.get(row.event_id) ?? [];
    locations.push({
      id: row.id,
      is_main_location: row.is_main_location,
      location: one(row.location),
    });
    locationsByEvent.set(row.event_id, locations);
  }

  const equipmentByEvent = new Map<number, EventEquipment[]>();
  for (const row of equipmentResult.data ?? []) {
    const equipment = equipmentByEvent.get(row.event_id) ?? [];
    const eventLocation = one(row.event_location);
    const event = (eventsResult.data ?? []).find((item) => item.id === row.event_id);
    const isFulfilled = event
      ? ["fulfilled", "completed"].includes(normalizeStatus(event.status))
      : false;
    equipment.push({
      id: row.equipment_id,
      status: isFulfilled ? "in use" : "reserved",
      deployed_at: null,
      equipment: one(row.equipment),
      event_location: eventLocation
        ? {
            id: eventLocation.id,
            is_main_location: eventLocation.is_main_location,
            location: one(eventLocation.location),
          }
        : null,
    });
    equipmentByEvent.set(row.event_id, equipment);
  }

  const events: Event[] = (eventsResult.data ?? []).map((event) => ({
    ...event,
    status: normalizeStatus(event.status, "planned"),
    responsible_users: responsibleByEvent.get(event.id) ?? [],
    event_locations:
      locationsByEvent.get(event.id) ??
      (equipmentByEvent.get(event.id) ?? [])
        .map((item) => item.event_location)
        .filter((item): item is EventLocation => Boolean(item)),
    event_equipment: equipmentByEvent.get(event.id) ?? [],
  }));

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Event operations
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Events</h1>
        <p className="mt-2 text-slate-600">
          See event locations, responsible team members, and equipment
          fulfilment in one place.
        </p>
        <CreateEventPanel
          locations={(availableLocationsResult.data ?? []).map((location) => ({
            id: location.id,
            label: location.name,
            detail: [location.block, location.level ? `Level ${location.level}` : null]
              .filter(Boolean)
              .join(" · "),
          }))}
          equipment={(availableEquipmentResult.data ?? [])
            .filter(
              (item) =>
                String(item.status ?? "available").trim().toLowerCase() ===
                "available",
            )
            .map((item) => ({
              id: item.id,
              label: item.code ?? `EQ-${item.id}`,
              detail: `${item.subcategory ?? "Equipment"} · ${item.status ?? "available"}`,
            }))}
          partTimers={(availablePartTimersResult.data ?? [])
            .filter((user) => (user.status ?? "active") === "active")
            .map((user) => ({
              id: user.id,
              label: user.name,
              detail: [user.student_id, user.role].filter(Boolean).join(" · "),
            }))}
        />
        {events.length ? (
          <EventList events={events} />
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="font-semibold text-slate-800">No events found</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add an event in Supabase to begin planning.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
