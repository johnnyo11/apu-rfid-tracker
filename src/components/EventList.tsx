"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Event } from "@/types/database";
import StatusToast from "@/components/StatusToast";
import EventDetailsPanel from "@/components/EventDetailsPanel";

const statusStyles: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  partially_fulfilled: "bg-amber-100 text-amber-800",
  fulfilled: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-600",
};

const label = (value: string) => value.replaceAll("_", " ");
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function eventProgress(event: Event) {
  const total = event.event_equipment.filter(
    (item) => item.status !== "cancelled",
  ).length;
  const deployed = event.event_equipment.filter((item) =>
    ["in_use", "deployed", "returned"].includes(item.status),
  ).length;
  return { total, deployed, complete: total > 0 && deployed === total };
}

function locationNames(event: Event) {
  return event.event_locations
    .slice()
    .sort(
      (a, b) => Number(b.is_main_location) - Number(a.is_main_location),
    )
    .map((item) => item.location?.name)
    .filter(Boolean)
    .join(", ");
}

function responsibleNames(event: Event) {
  return event.responsible_users
    .map((item) => item.part_timer?.name)
    .filter(Boolean)
    .join(", ");
}

function FulfilmentButton({ event }: { event: Event }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const alreadyConfirmed = ["fulfilled", "completed"].includes(event.status);
  const readyToConfirm =
    event.event_equipment.length > 0 &&
    event.event_locations.length > 0 &&
    event.responsible_users.length > 0;

  async function confirmFulfilment() {
    if (!supabase || !readyToConfirm || alreadyConfirmed) return;
    setSaving(true);
    setMessage(null);
    const { error, data } = await supabase
      .from("events")
      .update({ status: "fulfilled", updated_at: new Date().toISOString() })
      .eq("id", event.id)
      .not("status", "in", '("fulfilled","completed")')
      .select("id");
    if (error) {
      setSaving(false);
      setMessage(error.message);
      return;
    }
    if (!data?.length) {
      setSaving(false);
      setMessage("This event was already confirmed.");
      router.refresh();
      return;
    }

    const equipmentIds = event.event_equipment
      .map((assignment) => assignment.equipment?.id)
      .filter((id): id is number => typeof id === "number");
    const { data: deployedEquipment, error: deploymentError } = await supabase
      .from("equipment")
      .update({ status: "in_use", updated_at: new Date().toISOString() })
      .in("id", equipmentIds)
      .in("status", ["reserved", "available", "in_use"])
      .select("id");
    if (deploymentError || deployedEquipment?.length !== equipmentIds.length) {
      setSaving(false);
      setMessage(
        `Event confirmed, but equipment status could not be fully updated: ${deploymentError?.message ?? "one or more items are unavailable"}`,
      );
      router.refresh();
      return;
    }

    const operatingHours = event.end_at
      ? Math.max(
          0,
          (new Date(event.end_at).getTime() -
            new Date(event.start_at).getTime()) /
            3_600_000,
        )
      : 0;
    for (const assignment of event.event_equipment) {
      if (!assignment.equipment) continue;
      const { error: equipmentError } = await supabase
        .from("equipment")
        .update({
          total_hours_used:
            Number(assignment.equipment.total_hours_used ?? 0) + operatingHours,
        })
        .eq("id", assignment.equipment.id);
      if (equipmentError) {
        setSaving(false);
        setMessage(
          `Event confirmed, but operating hours could not be updated: ${equipmentError.message}`,
        );
        router.refresh();
        return;
      }
    }
    setSaving(false);
    setMessage("Event fulfilment confirmed and equipment marked in use.");
    router.refresh();
  }

  if (alreadyConfirmed) {
    return <span className="text-xs font-semibold text-emerald-700">Confirmed</span>;
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={confirmFulfilment}
        disabled={!readyToConfirm || saving}
        title={
          readyToConfirm
            ? "Confirm that the responsible part-timer deployed the assigned equipment"
            : "Assign equipment, a location, and a responsible part-timer first"
        }
        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
      >
        {saving ? "Confirming..." : "Confirm fulfilled"}
      </button>
      {message && (
        <StatusToast
          message={message}
          tone={
            message.includes("confirmed") ||
            message.includes("already confirmed")
              ? "success"
              : "error"
          }
          onDismiss={() => setMessage(null)}
        />
      )}
    </div>
  );
}

function EventCard({ event, onView }: { event: Event; onView: (event: Event) => void }) {
  const progress = eventProgress(event);
  const locations = locationNames(event);
  const team = responsibleNames(event);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            {dateTime(event.start_at)}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {event.event_name}
          </h2>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[event.status] ?? "bg-slate-100 text-slate-700"}`}
        >
          {label(event.status)}
        </span>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Responsible team</dt>
          <dd className="text-right font-medium text-slate-800">
            {team || "Not assigned"}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
          <dt className="text-slate-500">Locations</dt>
          <dd className="text-right font-medium text-slate-800">
            {locations || "Not assigned"}
          </dd>
        </div>
        <div className="border-t border-slate-100 pt-3">
          <div className="flex justify-between">
            <dt className="text-slate-500">Equipment deployed</dt>
            <dd className="font-semibold text-slate-800">
              {progress.deployed} of {progress.total}
            </dd>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{
                width: `${progress.total ? (progress.deployed / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </dl>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <button type="button" onClick={() => onView(event)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">View details</button>
        <FulfilmentButton event={event} />
      </div>
    </article>
  );
}

export default function EventList({ events }: { events: Event[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("upcoming");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [now] = useState(() => Date.now());
  const statuses = useMemo(
    () => [...new Set(events.map((event) => event.status))].sort(),
    [events],
  );

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events
      .filter((event) => {
        const searchable = [
          event.event_name,
          event.event_description,
          event.organizer_name,
          responsibleNames(event),
          locationNames(event),
          ...event.event_equipment.map((item) => item.equipment?.code),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const startsAt = new Date(event.start_at).getTime();
        return (
          searchable.includes(term) &&
          (status === "all" || event.status === status) &&
          (period === "all" ||
            (period === "upcoming" ? startsAt >= now : startsAt < now))
        );
      })
      .sort(
        (a, b) =>
          new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );
  }, [events, now, period, search, status]);

  const upcoming = events.filter(
    (event) =>
      new Date(event.start_at).getTime() >= now && event.status !== "cancelled",
  ).length;
  const fulfilled = events.filter((event) =>
    ["fulfilled", "completed"].includes(event.status),
  ).length;

  return (
    <section className="mt-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Total events", events.length],
          ["Upcoming", upcoming],
          ["Fulfilled", fulfilled],
        ].map(([name, value]) => (
          <div
            key={name}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-slate-500">{name}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem_14rem]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label="Search events"
          placeholder="Search event, team, location, equipment..."
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          aria-label="Filter by event status"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {label(value)}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(event) => setPeriod(event.target.value)}
          aria-label="Filter by event period"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All dates</option>
        </select>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Showing {results.length} of {events.length}
      </p>

      {results.length ? (
        <>
          <div className="mt-4 grid gap-4 md:hidden">
            {results.map((event) => (
              <EventCard key={event.id} event={event} onView={setSelectedEvent} />
            ))}
          </div>
          <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Event</th>
                    <th className="px-5 py-3">Date</th>
                    <th className="px-5 py-3">Responsible team</th>
                    <th className="px-5 py-3">Locations</th>
                    <th className="px-5 py-3">Equipment</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((event) => {
                    const progress = eventProgress(event);
                    return (
                      <tr key={event.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <button type="button" onClick={() => setSelectedEvent(event)} className="block text-left font-semibold text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            {event.event_name}
                          </button>
                          <span className="mt-0.5 block max-w-56 truncate text-xs text-slate-500">
                            {event.organizer_name || "No organizer"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          {dateTime(event.start_at)}
                        </td>
                        <td className="max-w-48 px-5 py-4 text-slate-700">
                          {responsibleNames(event) || "Not assigned"}
                        </td>
                        <td className="max-w-48 px-5 py-4 text-slate-700">
                          {locationNames(event) || "Not assigned"}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-700">
                          <span className="font-semibold">
                            {progress.deployed}
                          </span>{" "}
                          of {progress.total} deployed
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[event.status] ?? "bg-slate-100 text-slate-700"}`}
                          >
                            {label(event.status)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setSelectedEvent(event)} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">Details</button>
                            <FulfilmentButton event={event} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-semibold text-slate-800">No matching events</h2>
          <p className="mt-2 text-sm text-slate-500">
            Try another date range, status, or search.
          </p>
        </div>
      )}
      {selectedEvent && <EventDetailsPanel event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </section>
  );
}
