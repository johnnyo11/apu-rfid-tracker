export const EQUIPMENT_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  IN_USE: "in use",
  UNDER_MAINTENANCE: "under maintenance",
  RETIRED: "retired",
  LOST: "lost",
} as const;

export const EVENT_STATUS = {
  PLANNED: "planned",
  ASSIGNED: "assigned",
  PARTIALLY_FULFILLED: "partially fulfilled",
  FULFILLED: "fulfilled",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export const MAINTENANCE_STATUS = {
  REPORTED: "reported",
  IN_PROGRESS: "in progress",
  RESOLVED: "resolved",
} as const;

export const RFID_STATUS = {
  UNASSIGNED: "unassigned",
  ACTIVE: "active",
  INACTIVE: "inactive",
  LOST: "lost",
} as const;

export const USER_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export function normalizeStatus(
  value: string | null | undefined,
  fallback = "",
) {
  const clean = (input: string) =>
    input
      .trim()
      .toLowerCase()
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .replace(/\s+/g, " ");

  return clean(String(value ?? fallback)) || clean(fallback);
}
