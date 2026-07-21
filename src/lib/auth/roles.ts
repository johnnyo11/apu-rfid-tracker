export function normalizeAppRole(role: string | null | undefined) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replaceAll(" ", "_")
    .replaceAll("-", "_");
}

export function isManagerRole(role: string | null | undefined) {
  return [
    "admin",
    "quartermaster",
    "admin/quartermaster",
    "admin_quartermaster",
  ].includes(normalizeAppRole(role));
}
