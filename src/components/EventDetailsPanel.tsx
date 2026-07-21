"use client";

import type { Event } from "@/types/database";

const label = (value: string) => value.replaceAll("_", " ");
const dateTime = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function EventDetailsPanel({ event, onClose }: { event: Event; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="event-details-title" onMouseDown={(mouseEvent) => { if (mouseEvent.target === mouseEvent.currentTarget) onClose(); }}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Event details</p>
            <h2 id="event-details-title" className="mt-1 text-2xl font-bold text-slate-900">{event.event_name}</h2>
            <p className="mt-2 text-sm text-slate-600">{dateTime(event.start_at)}{event.end_at ? ` – ${dateTime(event.end_at)}` : ""}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close event details" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">&times;</button>
        </header>

        <div className="min-h-0 overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Locations</h3>
              <div className="mt-3 space-y-2">
                {event.event_locations.length ? event.event_locations.map((item) => <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3"><div><p className="font-semibold text-slate-800">{item.location?.name ?? "Unknown location"}</p><p className="mt-0.5 text-xs text-slate-500">{[item.location?.block, item.location?.level != null ? `Level ${item.location.level}` : null].filter(Boolean).join(" · ") || "No location details"}</p></div>{item.is_main_location && <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">Main</span>}</div>) : <p className="text-sm text-slate-500">No locations assigned.</p>}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-900">Responsible team</h3>
              <div className="mt-3 space-y-2">
                {event.responsible_users.length ? event.responsible_users.map((item) => <div key={item.part_timer_id} className="rounded-lg bg-slate-50 p-3"><p className="font-semibold text-slate-800">{item.part_timer?.name ?? "Unknown team member"}</p><p className="mt-0.5 text-xs capitalize text-slate-500">{item.part_timer?.student_id ?? "No student ID"} · {label(item.part_timer?.role ?? "part_timer")}</p></div>) : <p className="text-sm text-slate-500">No responsible team assigned.</p>}
              </div>
            </section>
          </div>

          <section className="mt-4 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3"><h3 className="font-bold text-slate-900">Required equipment</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{event.event_equipment.length} items</span></div>
            {event.event_equipment.length ? <div className="mt-3 overflow-hidden rounded-lg border border-slate-200"><div className="divide-y divide-slate-100">{event.event_equipment.map((item) => <div key={item.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p className="font-semibold text-slate-900">{item.equipment?.code ?? "Unknown equipment"}</p><p className="text-sm text-slate-500">{item.equipment?.subcategory ?? "Equipment"}</p></div><p className="text-sm text-slate-600">{item.event_location?.location?.name ?? "Event location not assigned"}</p><span className="w-fit rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">{label(item.status)}</span></div>)}</div></div> : <p className="mt-3 text-sm text-slate-500">No equipment requirements assigned.</p>}
          </section>

          {(event.event_description || event.organizer_name || event.organizer_contact || event.notes) && <section className="mt-4 rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Additional information</h3><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">{event.organizer_name && <div><dt className="text-slate-500">Organizer</dt><dd className="font-medium text-slate-800">{event.organizer_name}</dd></div>}{event.organizer_contact && <div><dt className="text-slate-500">Contact</dt><dd className="font-medium text-slate-800">{event.organizer_contact}</dd></div>}{event.event_description && <div className="sm:col-span-2"><dt className="text-slate-500">Description</dt><dd className="mt-1 text-slate-800">{event.event_description}</dd></div>}{event.notes && <div className="sm:col-span-2"><dt className="text-slate-500">Notes</dt><dd className="mt-1 text-slate-800">{event.notes}</dd></div>}</dl></section>}
        </div>

        <footer className="flex justify-end border-t border-slate-200 p-4 sm:px-6"><button type="button" onClick={onClose} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Close</button></footer>
      </div>
    </div>
  );
}
