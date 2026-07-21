"use client";

import { useMemo, useState } from "react";
import LocationCard from "@/components/LocationCard";
import LocationEquipmentPanel from "@/components/LocationEquipmentPanel";
import type { AvailableLocationEquipment, Location } from "@/types/database";

export default function LocationList({ locations, availableEquipment }: { locations: Location[]; availableEquipment: AvailableLocationEquipment[] }) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [block, setBlock] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const types = useMemo(() => [...new Set(locations.map((item) => item.type).filter(Boolean) as string[])].sort(), [locations]);
  const blocks = useMemo(() => [...new Set(locations.map((item) => item.block).filter(Boolean) as string[])].sort(), [locations]);
  const results = useMemo(() => { const term = search.trim().toLowerCase(); return locations.filter((item) => [item.name, item.type, item.block, item.location_detail, item.level?.toString()].filter(Boolean).join(" ").toLowerCase().includes(term) && (type === "all" || item.type === type) && (block === "all" || item.block === block)); }, [block, locations, search, type]);
  const assigned = locations.filter((item) => item.equipment.length > 0).length;
  const equipmentCount = locations.reduce((sum, item) => sum + item.equipment.length, 0);

  return <section className="mt-8"><div className="grid gap-3 sm:grid-cols-3">{[["Total locations", locations.length], ["In use", assigned], ["Equipment assigned", equipmentCount]].map(([name, value]) => <div key={name} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{name}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>)}</div><div className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_14rem_14rem]"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search locations..." aria-label="Search locations" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by location type" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All location types</option>{types.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select><select value={block} onChange={(event) => setBlock(event.target.value)} aria-label="Filter by block" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="all">All blocks</option>{blocks.map((value) => <option key={value} value={value}>{value}</option>)}</select></div><p className="mt-4 text-sm text-slate-500">Showing {results.length} of {locations.length}</p>{results.length ? <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.map((location) => <LocationCard key={location.id} location={location} onManageEquipment={setSelectedLocation} />)}</div> : <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold text-slate-800">No matching locations</h2><p className="mt-2 text-sm text-slate-500">Try changing your search, type, or block.</p></div>}{selectedLocation && <LocationEquipmentPanel location={selectedLocation} equipment={availableEquipment} onClose={() => setSelectedLocation(null)} />}</section>;
}
