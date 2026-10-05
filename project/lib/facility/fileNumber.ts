/** Normalise a hospital file number for storage and comparison. */
export function normalizeFileNumber(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

/** Case-insensitive comparison, matching the unique index on lower(file_number). */
export function sameFileNumber(a: unknown, b: unknown): boolean {
  return normalizeFileNumber(a).toLowerCase() === normalizeFileNumber(b).toLowerCase();
}

/** Prefix for generated numbers: the facility's own prefix, or letters from its name. */
export function filePrefixFor(facility: { name?: string; fileNumberPrefix?: string }): string {
  const own = (facility.fileNumberPrefix ?? "").trim().toUpperCase();
  if (own) return own;
  const letters = (facility.name ?? "").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3);
  return letters || "FAC";
}
