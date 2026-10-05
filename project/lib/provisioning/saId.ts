/** SA ID number helpers. Pure functions, safe for client components. */

/** DOB encoded in a SA ID number (YYMMDD), or null if the digits are not a date. */
export function dobFromSaId(saId: string): Date | null {
  if (!/^\d{13}$/.test(saId)) return null;
  const yy = Number(saId.slice(0, 2));
  const mm = Number(saId.slice(2, 4));
  const dd = Number(saId.slice(4, 6));
  const year = yy + (yy <= new Date().getUTCFullYear() % 100 ? 2000 : 1900);
  const d = new Date(Date.UTC(year, mm - 1, dd));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return d;
}

/** Digits 7-10 of a SA ID: 0000-4999 female, 5000-9999 male. */
export function genderFromSaId(saId: string): "male" | "female" | null {
  if (!/^\d{13}$/.test(saId)) return null;
  return Number(saId.slice(6, 10)) >= 5000 ? "male" : "female";
}
