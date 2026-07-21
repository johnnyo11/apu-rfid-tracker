"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import StatusToast from "@/components/StatusToast";

export default function AddLocationPanel() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!supabase) return setMessage({ type: "error", text: "Supabase is not configured." });
    const form = new FormData(formElement);
    const name = String(form.get("name") ?? "").trim();
    const type = String(form.get("type") ?? "").trim();
    const block = String(form.get("block") ?? "").trim();
    const levelValue = String(form.get("level") ?? "").trim();
    const locationDetail = String(form.get("location_detail") ?? "").trim();
    if (!name || !type) return setMessage({ type: "error", text: "Location name and type are required." });

    setIsSaving(true);
    setMessage(null);
    const { error } = await supabase.from("locations").insert({
      name,
      type,
      block: block || null,
      level: levelValue ? Number(levelValue) : null,
      location_detail: locationDetail || null,
    });
    setIsSaving(false);
    if (error) return setMessage({ type: "error", text: error.message });

    formElement.reset();
    setMessage({ type: "success", text: `${name} was added successfully.` });
    router.refresh();
  }

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => { setIsOpen((value) => !value); setMessage(null); }} aria-expanded={isOpen} className="flex w-full items-center justify-between gap-4 p-5 text-left">
        <span><span className="block font-semibold text-slate-900">Add a new location</span><span className="mt-1 block text-sm text-slate-500">Create a venue, room, storage area, or other equipment location.</span></span>
        <span className="text-2xl font-light text-blue-600" aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <form onSubmit={handleSubmit} className="border-t border-slate-200 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Location name<span className="text-red-600"> *</span><input name="name" required placeholder="e.g. Auditorium 1" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium text-slate-700">Location type<span className="text-red-600"> *</span><input name="type" required placeholder="e.g. Auditorium" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium text-slate-700">Block<input name="block" placeholder="e.g. Block B" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium text-slate-700">Level<input name="level" type="number" step="1" placeholder="e.g. 7" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          <label className="text-sm font-medium text-slate-700 sm:row-span-2">Location details<textarea name="location_detail" rows={3} placeholder="Stage box, storage shelf, access notes..." className="mt-1 block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
        </div>
        <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setIsOpen(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button><button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? "Adding..." : "Add location"}</button></div>
      </form>}
      {message && <StatusToast message={message.text} tone={message.type} onDismiss={() => setMessage(null)} />}
    </section>
  );
}
