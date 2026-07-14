"use client";

import { useMemo, useState } from "react";
import EquipmentCard from "@/components/EquipmentCard";
import type { Equipment } from "@/types/database";

const statusStyles: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-amber-100 text-amber-700",
  deployed: "bg-blue-100 text-blue-700",
  maintenance: "bg-red-100 text-red-700",
  retired: "bg-slate-200 text-slate-700",
};

const label = (value: string) => value.replaceAll("_", " ");

export default function EquipmentList({ equipment }: { equipment: Equipment[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [location, setLocation] = useState("all");
  const [tagged, setTagged] = useState("all");
  const [sort, setSort] = useState("code");

  const statuses = useMemo(() => [...new Set(equipment.map((item) => item.status))].sort(), [equipment]);
  const locations = useMemo(() => [...new Set(equipment.map((item) => item.location?.name).filter(Boolean) as string[])].sort(), [equipment]);

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return equipment.filter((item) => {
      const text = [item.code, item.category, item.subcategory, item.brand, item.model, item.serial_number].filter(Boolean).join(" ").toLowerCase();
      return (!term || text.includes(term))
        && (status === "all" || item.status === status)
        && (location === "all" || (location === "unassigned" ? !item.location : item.location?.name === location))
        && (tagged === "all" || item.is_tagged === (tagged === "tagged"));
    }).sort((a, b) => {
      if (sort === "name") return a.subcategory.localeCompare(b.subcategory);
      if (sort === "status") return a.status.localeCompare(b.status);
      if (sort === "location") return (a.location?.name ?? "").localeCompare(b.location?.name ?? "");
      return a.code.localeCompare(b.code);
    });
  }, [equipment, location, search, sort, status, tagged]);

  const clearFilters = () => { setSearch(""); setStatus("all"); setLocation("all"); setTagged("all"); setSort("code"); };
  const counts = {
    total: equipment.length,
    available: equipment.filter((item) => item.status === "available").length,
    deployed: equipment.filter((item) => ["deployed", "checked_out"].includes(item.status)).length,
    maintenance: equipment.filter((item) => item.status === "maintenance").length,
  };

  return (
    <section className="mt-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(counts).map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm capitalize text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>)}
      </div>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search equipment..." aria-label="Search equipment" className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:col-span-2" />
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select>
          <select value={location} onChange={(event) => setLocation(event.target.value)} aria-label="Filter by location" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All locations</option><option value="unassigned">Not assigned</option>{locations.map((value) => <option key={value} value={value}>{value}</option>)}</select>
          <select value={tagged} onChange={(event) => setTagged(event.target.value)} aria-label="Filter by RFID" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All RFID states</option><option value="tagged">Tagged</option><option value="not_tagged">Not tagged</option></select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Showing {results.length} of {equipment.length}</p>
          <div className="flex items-center gap-3"><select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort equipment" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="code">Sort by code</option><option value="name">Sort by name</option><option value="status">Sort by status</option><option value="location">Sort by location</option></select><button type="button" onClick={clearFilters} className="rounded-lg px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">Clear filters</button></div>
        </div>
      </div>
      {results.length ? <>
        <div className="mt-6 grid gap-5 md:hidden">{results.map((item) => <EquipmentCard key={item.id} equipment={item} />)}</div>
        <div className="mt-6 hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-5 py-3">Code</th><th scope="col" className="px-5 py-3">Equipment</th><th scope="col" className="px-5 py-3">Status</th><th scope="col" className="px-5 py-3">Condition</th><th scope="col" className="px-5 py-3">Location</th><th scope="col" className="px-5 py-3">RFID</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((item) => <tr key={item.id} className="transition-colors hover:bg-slate-50"><td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-600">{item.code}</td><td className="px-5 py-4"><span className="block font-semibold text-slate-900">{item.subcategory}</span><span className="mt-0.5 block text-xs text-slate-500">{item.category}{item.brand ? ` · ${item.brand}` : ""}</span></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[item.status] ?? "bg-slate-100 text-slate-700"}`}>{label(item.status)}</span></td><td className="px-5 py-4 capitalize text-slate-700">{label(item.current_condition)}</td><td className="px-5 py-4 text-slate-700">{item.location?.name ?? "Not assigned"}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.is_tagged ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{item.is_tagged ? "Tagged" : "Not tagged"}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </> : <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">No matching equipment</h2><p className="mt-2 text-sm text-slate-500">Try changing or clearing the filters.</p><button type="button" onClick={clearFilters} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Clear filters</button></div>}
    </section>
  );
}
