import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { EQUIPMENT_STATUS, RFID_STATUS } from "@/lib/status";

export const runtime = "nodejs";

const DUPLICATE_WINDOW_MS = 3_000;

function normalizeUid(value: unknown) {
  if (typeof value !== "string") return null;
  const uid = value.replace(/[^0-9a-f]/gi, "").toUpperCase();
  return /^[0-9A-F]{8}$|^[0-9A-F]{14}$|^[0-9A-F]{20}$/.test(uid)
    ? uid
    : null;
}

function hasValidDeviceKey(request: Request) {
  const expected = process.env.RFID_DEVICE_SECRET;
  const received = request.headers.get("x-device-key");
  if (!expected || !received) return false;

  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export async function POST(request: Request) {
  if (!hasValidDeviceKey(request)) {
    return NextResponse.json(
      { ok: false, error: "Device authentication failed." },
      { status: 401 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serverKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serverKey) {
    return NextResponse.json(
      { ok: false, error: "RFID server integration is not configured." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "The request body must be valid JSON." },
      { status: 400 },
    );
  }

  const uid = normalizeUid(
    typeof body === "object" && body !== null && "tag_uid" in body
      ? body.tag_uid
      : null,
  );
  if (!uid) {
    return NextResponse.json(
      {
        ok: false,
        error: "tag_uid must be an RC522 UID containing 8, 14, or 20 hex characters.",
      },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, serverKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tag, error: tagError } = await supabase
    .from("rfid_tags")
    .select("tagged_id, tag_code, assigned_equipment_id")
    .eq("tag_uid", uid)
    .eq("status", RFID_STATUS.ACTIVE)
    .maybeSingle();

  if (tagError) {
    console.error("RFID tag lookup failed", tagError);
    return NextResponse.json(
      { ok: false, error: "Could not look up the RFID tag." },
      { status: 500 },
    );
  }
  if (!tag) {
    return NextResponse.json(
      { ok: false, error: "This RFID tag is not assigned to active equipment." },
      { status: 404 },
    );
  }

  const { data: latestScan, error: latestScanError } = await supabase
    .from("scan_logs")
    .select("id, movement_type, scanned_at")
    .eq("rfid_tag_id", tag.tagged_id)
    .order("scanned_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestScanError) {
    console.error("Latest RFID scan lookup failed", latestScanError);
    return NextResponse.json(
      { ok: false, error: "Could not read the latest movement." },
      { status: 500 },
    );
  }

  const now = new Date();
  if (
    latestScan?.scanned_at &&
    now.getTime() - new Date(latestScan.scanned_at).getTime() <
      DUPLICATE_WINDOW_MS
  ) {
    return NextResponse.json({
      ok: true,
      accepted: false,
      duplicate: true,
      tag_uid: uid,
      message: "Repeated scan ignored. Remove the tag before scanning again.",
    });
  }

  const movementType =
    latestScan?.movement_type === "checked_out" ? "checked_in" : "checked_out";

  const { data: movement, error: insertError } = await supabase
    .from("scan_logs")
    .insert({
      rfid_tag_id: tag.tagged_id,
      movement_type: movementType,
      scanned_at: now.toISOString(),
    })
    .select("id, movement_type, scanned_at")
    .single();

  if (insertError) {
    console.error("RFID movement insert failed", insertError);
    return NextResponse.json(
      { ok: false, error: "Could not record the equipment movement." },
      { status: 500 },
    );
  }

  const nextEquipmentStatus =
    movementType === "checked_out"
      ? EQUIPMENT_STATUS.IN_USE
      : EQUIPMENT_STATUS.AVAILABLE;
  const { data: updatedEquipment, error: equipmentStatusError } = await supabase
    .from("equipment")
    .update({
      status: nextEquipmentStatus,
      updated_at: now.toISOString(),
    })
    .eq("id", tag.assigned_equipment_id)
    .not(
      "status",
      "in",
      `("${EQUIPMENT_STATUS.UNDER_MAINTENANCE}","${EQUIPMENT_STATUS.RETIRED}")`,
    )
    .select("id");

  if (equipmentStatusError) {
    console.error("Equipment status update failed", equipmentStatusError);
  }

  return NextResponse.json({
    ok: true,
    accepted: true,
    tag_uid: uid,
    tag_code: tag.tag_code,
    equipment_id: tag.assigned_equipment_id,
    equipment_status: updatedEquipment?.length ? nextEquipmentStatus : null,
    status_updated: Boolean(updatedEquipment?.length),
    warning: equipmentStatusError
      ? "Movement was recorded, but equipment status could not be updated."
      : undefined,
    movement,
  });
}
