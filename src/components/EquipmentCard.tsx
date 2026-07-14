import type { Equipment } from "@/types/database";

type EquipmentCardProps = {
  equipment: Equipment;
};

const statusStyles: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-700",
  checked_out: "bg-amber-100 text-amber-700",
  deployed: "bg-blue-100 text-blue-700",
  maintenance: "bg-red-100 text-red-700",
  retired: "bg-slate-200 text-slate-700",
};

const taggedStyles: Record<string, string> = {
  true: "bg-emerald-100 text-emerald-700",
  false: "bg-red-200 text-red-700",
};

function formatLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function EquipmentCard({ equipment }: EquipmentCardProps) {
  const statusClass =
    statusStyles[equipment.status.toLowerCase()] ??
    "bg-slate-100 text-slate-700";

  const taggedClass =
    taggedStyles[equipment.is_tagged.toString()] ??
    "bg-slate-100 text-slate-700";

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            {equipment.code}
          </p>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            {equipment.subcategory}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{equipment.category}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass}`}
        >
          {formatLabel(equipment.status)}
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Condition</dt>
          <dd className="font-medium capitalize text-slate-800">
            {formatLabel(equipment.current_condition)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
          <dt className="text-slate-500">Current location</dt>
          <dd className="text-right font-medium text-slate-800">
            {equipment.location?.name ?? "Not assigned"}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-slate-100 pt-3">
          <dt className="text-slate-500">RFID tag</dt>
          <dd>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${taggedClass}`}
            >
              {equipment.is_tagged ? "Tagged" : "Not tagged"}
            </span>
          </dd>
        </div>
      </dl>
    </article>
  );
}
