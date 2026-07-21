"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { EventFormOption } from "@/types/database";
import StatusToast from "@/components/StatusToast";

type Props = {
  locations: EventFormOption[];
  equipment: EventFormOption[];
  partTimers: EventFormOption[];
};

type Message = { type: "success" | "error"; text: string };

export default function CreateEventPanel({
  locations,
  equipment,
  partTimers,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedLocations, setSelectedLocations] = useState<number[]>([]);
  const [mainLocationId, setMainLocationId] = useState<number | null>(null);
  const [selectedEquipment, setSelectedEquipment] = useState<number[]>([]);
  const [selectedPartTimers, setSelectedPartTimers] = useState<number[]>([]);
  const [locationOptions, setLocationOptions] = useState(locations);
  const [equipmentOptions, setEquipmentOptions] = useState(equipment);
  const [partTimerOptions, setPartTimerOptions] = useState(partTimers);
  const [loadingOptions, setLoadingOptions] = useState(false);

  const selectedLocationOptions = useMemo(
    () =>
      locationOptions.filter((item) => selectedLocations.includes(item.id)),
    [locationOptions, selectedLocations],
  );

  async function refreshOptions() {
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase is not configured." });
      return;
    }

    setLoadingOptions(true);
    const [locationResult, equipmentResult, partTimerResult] =
      await Promise.all([
        supabase.from("locations").select("id, name, block, level").order("name"),
        supabase
          .from("equipment")
          .select("id, code, subcategory, status")
          .order("code"),
        supabase
          .from("part_timer")
          .select("id, student_id, name, role, status")
          .order("name"),
      ]);
    setLoadingOptions(false);

    const firstError = [
      locationResult.error,
      equipmentResult.error,
      partTimerResult.error,
    ].find(Boolean);
    if (firstError) {
      setMessage({
        type: "error",
        text: `Could not load event choices: ${firstError.message}`,
      });
      return;
    }

    setLocationOptions(
      (locationResult.data ?? []).map((location) => ({
        id: location.id,
        label: location.name,
        detail: [
          location.block,
          location.level ? `Level ${location.level}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
    );
    setEquipmentOptions(
      (equipmentResult.data ?? [])
        .filter((item) => {
          const status = String(item.status ?? "available")
            .trim()
            .toLowerCase()
            .replaceAll(" ", "_")
            .replaceAll("-", "_");
          return status === "available";
        })
        .map((item) => ({
          id: item.id,
          label: item.code ?? `EQ-${item.id}`,
          detail: `${item.subcategory ?? "Equipment"} · ${item.status ?? "available"}`,
        })),
    );
    setPartTimerOptions(
      (partTimerResult.data ?? [])
        .filter(
          (user) =>
            String(user.status ?? "active").trim().toLowerCase() === "active",
        )
        .map((user) => ({
          id: user.id,
          label: user.name,
          detail: [user.student_id, user.role].filter(Boolean).join(" · "),
        })),
    );
  }

  function toggle(
    value: number,
    selected: number[],
    setSelected: (value: number[]) => void,
  ) {
    setSelected(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  function toggleLocation(id: number) {
    const next = selectedLocations.includes(id)
      ? selectedLocations.filter((item) => item !== id)
      : [...selectedLocations, id];
    setSelectedLocations(next);
    if (!next.includes(mainLocationId ?? -1)) {
      setMainLocationId(next[0] ?? null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!supabase) {
      setMessage({ type: "error", text: "Supabase is not configured." });
      return;
    }
    if (!selectedLocations.length || !mainLocationId) {
      setMessage({
        type: "error",
        text: "Select at least one location and identify the main location.",
      });
      return;
    }

    const form = new FormData(formElement);
    const eventName = String(form.get("event_name") ?? "").trim();
    const startAt = String(form.get("start_at") ?? "");
    const endAt = String(form.get("end_at") ?? "");
    if (!eventName || !startAt) {
      setMessage({
        type: "error",
        text: "Event name and start date are required.",
      });
      return;
    }
    if (endAt && new Date(endAt) <= new Date(startAt)) {
      setMessage({
        type: "error",
        text: "The event end time must be later than its start time.",
      });
      return;
    }

    setSaving(true);
    setMessage(null);

    const { data: createdEvent, error: eventError } = await supabase
      .from("events")
      .insert({
        event_name: eventName,
        event_description:
          String(form.get("event_description") ?? "").trim() || null,
        organizer_name:
          String(form.get("organizer_name") ?? "").trim() || null,
        organizer_contact:
          String(form.get("organizer_contact") ?? "").trim() || null,
        start_at: new Date(startAt).toISOString(),
        end_at: endAt ? new Date(endAt).toISOString() : null,
        status: "planned",
        notes: String(form.get("notes") ?? "").trim() || null,
      })
      .select("id")
      .single();

    if (eventError || !createdEvent) {
      setSaving(false);
      setMessage({
        type: "error",
        text: eventError?.message ?? "The event could not be created.",
      });
      return;
    }

    const { data: createdLocations, error: locationsError } = await supabase
      .from("event_locations")
      .insert(
        selectedLocations.map((locationId) => ({
          event_id: createdEvent.id,
          location_id: locationId,
          is_main_location: locationId === mainLocationId,
        })),
      )
      .select("id, location_id");

    if (locationsError || !createdLocations) {
      setSaving(false);
      setMessage({
        type: "error",
        text: `Event created, but its locations could not be assigned: ${locationsError?.message ?? "Unknown error"}`,
      });
      router.refresh();
      return;
    }

    const mainEventLocation = createdLocations.find(
      (item) => item.location_id === mainLocationId,
    );
    const assignmentErrors: string[] = [];

    if (selectedEquipment.length && mainEventLocation) {
      const { error } = await supabase.from("event_requirement").insert(
        selectedEquipment.map((equipmentId) => ({
          event_id: createdEvent.id,
          equipment_id: equipmentId,
          location_id: mainEventLocation.id,
        })),
      );
      if (error) {
        assignmentErrors.push(`equipment: ${error.message}`);
      } else {
        const { data: reservedEquipment, error: reserveError } = await supabase
          .from("equipment")
          .update({ status: "reserved", updated_at: new Date().toISOString() })
          .in("id", selectedEquipment)
          .ilike("status", "available")
          .select("id");

        if (reserveError || reservedEquipment?.length !== selectedEquipment.length) {
          const reservedIds = (reservedEquipment ?? []).map((item) => item.id);
          await supabase
            .from("event_requirement")
            .delete()
            .eq("event_id", createdEvent.id)
            .in("equipment_id", selectedEquipment);
          if (reservedIds.length) {
            await supabase
              .from("equipment")
              .update({ status: "available", updated_at: new Date().toISOString() })
              .in("id", reservedIds)
              .eq("status", "reserved");
          }
          assignmentErrors.push(
            `equipment reservation: ${reserveError?.message ?? "one or more items are no longer available"}`,
          );
        }
      }
    }

    if (selectedPartTimers.length) {
      const { error } = await supabase
        .from("part_timer_responsible")
        .insert(
          selectedPartTimers.map((partTimerId) => ({
            event_id: createdEvent.id,
            part_timer_id: partTimerId,
          })),
        );
      if (error) assignmentErrors.push(`part-timers: ${error.message}`);
    }

    setSaving(false);
    if (assignmentErrors.length) {
      setMessage({
        type: "error",
        text: `Event created, but some assignments need attention (${assignmentErrors.join("; ")}).`,
      });
    } else {
      setMessage({
        type: "success",
        text: `${eventName} was created successfully.`,
      });
      formElement.reset();
      setSelectedLocations([]);
      setMainLocationId(null);
      setSelectedEquipment([]);
      setSelectedPartTimers([]);
    }
    router.refresh();
  }

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Event planning</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create an event and assign its locations, equipment, and team.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const nextOpen = !open;
            setOpen(nextOpen);
            setMessage(null);
            if (nextOpen) void refreshOptions();
          }}
          aria-expanded={open}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <span aria-hidden="true">{open ? "−" : "+"}</span>
          {open ? "Close form" : "New event"}
        </button>
      </div>

      {open && (
        <form
          onSubmit={handleSubmit}
          className="mt-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 border-b border-slate-200 pb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Create new event
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Required fields are marked with an asterisk.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Event name <span className="text-red-600">*</span>
              <input
                name="event_name"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Organizer
              <input
                name="organizer_name"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Start <span className="text-red-600">*</span>
              <input
                name="start_at"
                type="datetime-local"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              End
              <input
                name="end_at"
                type="datetime-local"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Organizer contact
              <input
                name="organizer_contact"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700 md:row-span-2">
              Description
              <textarea
                name="event_description"
                rows={3}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Notes
              <input
                name="notes"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              />
            </label>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <fieldset className="rounded-lg border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-800">
                Locations <span className="text-red-600">*</span>
              </legend>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {locationOptions.map((item) => (
                  <label key={item.id} className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(item.id)}
                      onChange={() => toggleLocation(item.id)}
                    />
                    <span>
                      <span className="block font-medium text-slate-800">
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="text-xs text-slate-500">
                          {item.detail}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                {!loadingOptions && !locationOptions.length && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    No locations are accessible. Add a location or check the
                    locations SELECT policy.
                  </p>
                )}
              </div>
              {selectedLocationOptions.length > 0 && (
                <label className="mt-4 block text-xs font-semibold text-slate-600">
                  Main location
                  <select
                    value={mainLocationId ?? ""}
                    onChange={(event) =>
                      setMainLocationId(Number(event.target.value))
                    }
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-normal"
                  >
                    {selectedLocationOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </fieldset>

            <fieldset className="rounded-lg border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-800">
                Equipment
              </legend>
              <p className="mb-3 text-xs text-slate-500">
                Initial assignments use the main event location.
              </p>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {equipmentOptions.map((item) => (
                  <label key={item.id} className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(item.id)}
                      onChange={() =>
                        toggle(
                          item.id,
                          selectedEquipment,
                          setSelectedEquipment,
                        )
                      }
                    />
                    <span>
                      <span className="block font-medium text-slate-800">
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="text-xs text-slate-500">
                          {item.detail}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                {!loadingOptions && !equipmentOptions.length && (
                  <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                    No available equipment is accessible. Check equipment
                    records, statuses, and the equipment SELECT policy.
                  </p>
                )}
              </div>
            </fieldset>

            <fieldset className="rounded-lg border border-slate-200 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-800">
                Responsible team
              </legend>
              <div className="max-h-52 space-y-2 overflow-y-auto">
                {partTimerOptions.map((item) => (
                  <label key={item.id} className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedPartTimers.includes(item.id)}
                      onChange={() =>
                        toggle(
                          item.id,
                          selectedPartTimers,
                          setSelectedPartTimers,
                        )
                      }
                    />
                    <span>
                      <span className="block font-medium text-slate-800">
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="text-xs text-slate-500">
                          {item.detail}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
                {!loadingOptions && !partTimerOptions.length && (
                  <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                    No active part-timers are accessible. You may create the
                    event without assigning one yet.
                  </p>
                )}
              </div>
            </fieldset>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loadingOptions || !locationOptions.length}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loadingOptions
                ? "Loading choices..."
                : saving
                  ? "Creating..."
                  : "Create event"}
            </button>
          </div>
        </form>
      )}
      {message && (
        <StatusToast
          message={message.text}
          tone={message.type}
          onDismiss={() => setMessage(null)}
        />
      )}
    </section>
  );
}
