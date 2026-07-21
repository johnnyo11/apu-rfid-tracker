import Link from "next/link";
import { isManagerRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const tools = [
  {
    href: "/activity",
    title: "Movement history",
    description:
      "Review automatic RFID check-out and check-in records in time order.",
    action: "View scan logs",
  },
  {
    href: "/maintenance",
    title: "Maintenance",
    description:
      "Report equipment issues, follow repair progress, and reset operating hours after resolution.",
    action: "Manage maintenance",
  },
  {
    href: "/rfid",
    title: "RFID assignments",
    description:
      "Link a physical tag UID to one equipment record and review active assignments.",
    action: "Manage RFID tags",
  },
] as const;

export default async function OperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ access?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("part_timer")
        .select("role, status")
        .eq("auth_user_id", user.id)
        .maybeSingle()
    : { data: null };
  const canManageRfid = Boolean(
    profile &&
      String(profile.status ?? "").trim().toLowerCase() === "active" &&
      isManagerRole(profile.role),
  );
  const visibleTools = tools.filter(
    (tool) => tool.href !== "/rfid" || canManageRfid,
  );
  const accessDenied = (await searchParams).access === "rfid_denied";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
          Daily operations
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Operations</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Monitor equipment movement, manage RFID assignments, and record
          maintenance from one predictable place.
        </p>

        {accessDenied && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            RFID tag assignments are restricted to active administrators and
            quartermasters.
          </p>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex min-h-56 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <h2 className="text-lg font-bold text-slate-900">
                {tool.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {tool.description}
              </p>
              <span className="mt-auto pt-6 text-sm font-semibold text-blue-600">
                {tool.action} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </section>

        <aside className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          RFID scans create movement records automatically. A responsible
          part-timer then confirms event fulfilment from the Events page.
        </aside>
      </div>
    </main>
  );
}
