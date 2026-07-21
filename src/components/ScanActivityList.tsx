"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { ScanActivity } from "@/types/database";

const label = (value: string) => value.replaceAll("_", " ");
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export default function ScanActivityList({
  scans,
}: {
  scans: ScanActivity[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [movement, setMovement] = useState("all");
  const [liveStatus, setLiveStatus] = useState<
    "connecting" | "live" | "unavailable"
  >(supabase ? "connecting" : "unavailable");
  const [refreshing, startRefresh] = useTransition();

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const channel = client
      .channel("scan-log-live-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "scan_logs",
        },
        () => {
          startRefresh(() => router.refresh());
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setLiveStatus("live");
        if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          setLiveStatus("unavailable");
        }
      });

    return () => {
      void client.removeChannel(channel);
    };
  }, [router]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scans.filter((scan) => {
      const text = [
        scan.equipment?.code,
        scan.equipment?.subcategory,
        scan.movement_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return (
        text.includes(term) &&
        (movement === "all" || scan.movement_type === movement)
      );
    });
  }, [movement, scans, search]);

  const checkedOut = scans.filter(
    (scan) => scan.movement_type === "checked_out",
  ).length;
  const checkedIn = scans.filter(
    (scan) => scan.movement_type === "checked_in",
  ).length;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          New accepted RFID scans appear here automatically.
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
            liveStatus === "live"
              ? "bg-emerald-100 text-emerald-700"
              : liveStatus === "connecting"
                ? "bg-amber-100 text-amber-800"
                : "bg-slate-100 text-slate-600"
          }`}
          title={
            liveStatus === "unavailable"
              ? "Enable Realtime for scan_logs and check its SELECT policy"
              : undefined
          }
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              liveStatus === "live"
                ? "bg-emerald-500"
                : liveStatus === "connecting"
                  ? "bg-amber-500"
                  : "bg-slate-400"
            }`}
          />
          {refreshing
            ? "Updating"
            : liveStatus === "live"
              ? "Live"
              : liveStatus === "connecting"
                ? "Connecting"
                : "Refresh required"}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Recorded movements", scans.length],
          ["Checked out", checkedOut],
          ["Checked in", checkedIn],
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

      <div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search equipment or movement..."
          aria-label="Search movement history"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={movement}
          onChange={(event) => setMovement(event.target.value)}
          aria-label="Filter movement type"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All movements</option>
          <option value="checked_out">Checked out</option>
          <option value="checked_in">Checked in</option>
        </select>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Showing {results.length} of {scans.length}
      </p>

      {results.length ? (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {results.map((scan) => (
              <article
                key={scan.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {scan.equipment?.code ?? "Unknown equipment"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {scan.equipment?.subcategory ?? "No equipment match"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                      scan.movement_type === "checked_out"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {label(scan.movement_type)}
                  </span>
                </div>
                <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                  {formatDateTime(scan.scanned_at)}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-4 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Equipment</th>
                  <th className="px-5 py-3">Movement</th>
                  <th className="px-5 py-3">Recorded at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <span className="block font-semibold text-slate-900">
                        {scan.equipment?.code ?? "Unknown equipment"}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {scan.equipment?.subcategory ?? "No equipment match"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          scan.movement_type === "checked_out"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {label(scan.movement_type)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {formatDateTime(scan.scanned_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-semibold text-slate-800">
            No matching movements
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Try another search or movement filter.
          </p>
        </div>
      )}
    </section>
  );
}
