import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { normalizeStatus } from "@/lib/status";

export const dynamic = "force-dynamic";
const label = (value: string) => value.replaceAll("_", " ");
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;

const eventStatusStyles: Record<string, string> = {
  planned: "bg-slate-100 text-slate-700",
  assigned: "bg-blue-100 text-blue-700",
  "partially fulfilled": "bg-amber-100 text-amber-800",
  fulfilled: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
};

function malaysiaDayBounds(now: Date) {
  const malaysiaTime = new Date(now.getTime() + MALAYSIA_OFFSET_MS);
  const start = new Date(
    Date.UTC(
      malaysiaTime.getUTCFullYear(),
      malaysiaTime.getUTCMonth(),
      malaysiaTime.getUTCDate(),
    ) - MALAYSIA_OFFSET_MS,
  );
  return {
    start,
    end: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

const eventTime = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));

const eventDate = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    weekday: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Configure Supabase to view the dashboard.
          </p>
        </div>
      </main>
    );
  }
  const supabase = await createClient();

  const [equipmentResult, locationsResult, eventsResult] =
    await Promise.all([
      supabase
        .from("equipment")
        .select(
          "id, code, subcategory, status, current_condition, total_hours_used, used_threshold, location:locations(name), rfid_tags(tagged_id, status)",
        )
        .order("code"),
      supabase.from("locations").select("id", { count: "exact", head: true }),
      supabase
        .from("events")
        .select(
          "id, event_name, start_at, end_at, status, event_locations(is_main_location, location:locations(name))",
        )
        .neq("status", "cancelled")
        .order("start_at")
        .limit(50),
    ]);

  const dashboardError = [
    equipmentResult.error,
    locationsResult.error,
    eventsResult.error,
  ].find(Boolean);
  if (dashboardError) {
    throw new Error(`Could not load dashboard: ${dashboardError.message}`);
  }
  const equipment = (equipmentResult.data ?? []).map((item) => ({
    ...item,
    code: item.code ?? `EQ-${item.id}`,
    subcategory: item.subcategory ?? "Equipment",
    status: normalizeStatus(item.status, "available"),
    current_condition: item.current_condition ?? "not_inspected",
    is_tagged: item.rfid_tags.some((tag) => tag.status === "active"),
    estimated_hours: Number(item.total_hours_used ?? 0),
  }));
  const available = equipment.filter(
    (item) => item.status === "available",
  ).length;
  const inUse = equipment.filter((item) =>
    ["in use", "deployed", "checked out"].includes(item.status),
  ).length;
  const attention = equipment.filter(
    (item) =>
      ["inspection required", "under maintenance", "lost"].includes(
        item.status,
      ) ||
      ["damaged", "unusable"].includes(item.current_condition) ||
      Boolean(
        item.used_threshold && item.estimated_hours >= item.used_threshold,
      ),
  );
  const metrics = [
    ["Total equipment", equipment.length, "All tracked items", "/equipment"],
    ["Available", available, "Ready to use", "/equipment"],
    ["In use", inUse, "Currently deployed", "/equipment"],
    ["Needs attention", attention.length, "Review these first", "#attention"],
  ] as const;
  const now = new Date();
  const todayBounds = malaysiaDayBounds(now);
  const dashboardEvents = (eventsResult.data ?? []).map((event) => ({
    ...event,
    status: normalizeStatus(event.status, "planned"),
  }));
  const activeEvents = dashboardEvents.filter((event) => {
    const eventEnd = new Date(event.end_at ?? event.start_at).getTime();
    return eventEnd >= todayBounds.start.getTime();
  });
  const todaysEvents = activeEvents.filter((event) => {
    const startsAt = new Date(event.start_at).getTime();
    const endsAt = new Date(event.end_at ?? event.start_at).getTime();
    return (
      startsAt < todayBounds.end.getTime() &&
      endsAt >= todayBounds.start.getTime()
    );
  });
  const upcomingEvents = activeEvents
    .filter(
      (event) => new Date(event.start_at).getTime() >= todayBounds.end.getTime(),
    )
    .slice(0, 5);

  function mainLocationName(event: (typeof activeEvents)[number]) {
    const locations = event.event_locations ?? [];
    const selected =
      locations.find((location) => location.is_main_location) ?? locations[0];
    const location = selected?.location;
    const record = Array.isArray(location) ? location[0] : location;
    return record?.name ?? "Location not assigned";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            AV inventory management
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-600">
            See what is ready, what is deployed, and what needs attention.
          </p>
        </header>

        <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {metrics.map(([name, value, detail, href]) => (
            <Link
              key={name}
              href={href}
              className="min-h-36 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 sm:min-h-0 sm:p-5"
            >
              <p className="text-sm font-medium text-slate-500">{name}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{value}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
            </Link>
          ))}
        </section>

        <section className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">Event schedule</h2>
              <p className="mt-1 text-sm text-slate-500">
                Today&apos;s work and the next events requiring preparation
              </p>
            </div>
            <Link href="/events" className="shrink-0 text-sm font-semibold text-blue-600">
              View all events
            </Link>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] lg:divide-x lg:divide-slate-200">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Today</h3>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {todaysEvents.length} event{todaysEvents.length === 1 ? "" : "s"}
                </span>
              </div>
              {todaysEvents.length ? (
                <div className="mt-4 space-y-3">
                  {todaysEvents.slice(0, 4).map((event) => (
                    <Link
                      key={event.id}
                      href="/events"
                      className="flex items-center gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                    >
                      <div className="w-20 shrink-0 text-center">
                        <p className="font-bold text-slate-900">
                          {eventTime(event.start_at)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {event.end_at ? `to ${eventTime(event.end_at)}` : "Start"}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1 border-l border-slate-200 pl-4">
                        <p className="truncate font-semibold text-slate-900">
                          {event.event_name}
                        </p>
                        <p className="mt-1 truncate text-sm text-slate-500">
                          {mainLocationName(event)}
                        </p>
                      </div>
                      <span
                        className={`hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize sm:inline-flex ${eventStatusStyles[event.status] ?? "bg-slate-100 text-slate-700"}`}
                      >
                        {label(event.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-6 text-center">
                  <p className="font-semibold text-slate-700">No events today</p>
                  <p className="mt-1 text-sm text-slate-500">
                    The AV team has no scheduled event work today.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 p-5 lg:border-t-0">
              <h3 className="font-semibold text-slate-900">Upcoming</h3>
              {upcomingEvents.length ? (
                <div className="mt-4 divide-y divide-slate-100">
                  {upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href="/events"
                      className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="w-16 shrink-0">
                        <p className="text-sm font-semibold text-blue-700">
                          {eventDate(event.start_at)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {eventTime(event.start_at)}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {event.event_name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {mainLocationName(event)}
                        </p>
                      </div>
                      <span className="text-blue-600" aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg bg-slate-50 p-5 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    No upcoming events scheduled.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <section
            id="attention"
            className="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-bold text-slate-900">Needs attention</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Inspection due, damaged, unavailable, or lost
                </p>
              </div>
              <Link
                href="/equipment"
                className="text-sm font-semibold text-blue-600"
              >
                View all
              </Link>
            </div>
            {attention.length ? (
              <div className="divide-y divide-slate-100">
                {attention.slice(0, 6).map((item) => {
                  const location = Array.isArray(item.location)
                    ? item.location[0]
                    : item.location;
                  const inspectionDue = Boolean(
                    item.used_threshold &&
                      item.estimated_hours >= item.used_threshold,
                  );
                  const serious =
                    item.current_condition === "damaged" ||
                    ["inspection required", "under maintenance"].includes(
                      item.status,
                    );
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">
                          {item.subcategory}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.code} · {location?.name ?? "Not assigned"}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          serious
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {inspectionDue
                          ? "Inspection due"
                          : label(item.current_condition)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="font-semibold text-emerald-700">
                  Everything looks ready
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  No equipment currently needs attention.
                </p>
              </div>
            )}
          </section>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold text-slate-900">Quick access</h2>
            <p className="mt-1 text-sm text-slate-500">
              Common tasks and operational records.
            </p>
            <nav className="mt-5 space-y-3">
              {[
                [
                  "/equipment",
                  "Equipment",
                  `${equipment.length} tracked items`,
                ],
                [
                  "/locations",
                  "Locations",
                  `${locationsResult.count ?? 0} saved locations`,
                ],
                [
                  "/operations",
                  "Operations",
                  "Movements, RFID, and maintenance",
                ],
              ].map(([href, name, detail]) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <span>
                    <span className="block font-semibold text-slate-900">
                      {name}
                    </span>
                    <span className="mt-0.5 block text-sm text-slate-500">
                      {detail}
                    </span>
                  </span>
                  <span className="text-xl text-blue-600" aria-hidden="true">
                    →
                  </span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      </div>
    </main>
  );
}
