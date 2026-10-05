/**
 * Phone normalisation for DigiHealth. South African mobile numbers (+27) only.
 */

export type PhoneRegion = "ZA";

export interface NormalizedPhone {
  e164: string;
  region: PhoneRegion;
  national: string;
  masked: string;
}

/**
 * Normalise a user-entered South African mobile to E.164 (+27XXXXXXXXX).
 * Accepts +27…, 27…, 0XXXXXXXXX and a bare 9-digit national number. Anything else
 * (including other country codes) returns null.
 */
export function normalizePhoneZa(input: string): NormalizedPhone | null {
  if (!input?.trim()) return null;
  const d = String(input).replace(/\D/g, "");

  let national: string | null = null;
  if (d.startsWith("27") && d.length === 11) national = d.slice(2);
  else if (d.startsWith("0") && !d.startsWith("00") && d.length === 10) national = d.slice(1);
  else if (/^[6-8]\d{8}$/.test(d)) national = d;

  if (!national || !/^[6-8]\d{8}$/.test(national)) return null;
  const e164 = `+27${national}`;
  return { e164, region: "ZA", national, masked: maskE164(e164) };
}

/** Kept for existing callers; South African numbers only. */
export const normalizePhoneZaSz = normalizePhoneZa;

export function maskE164(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length < 6) return "••••••••";
  const last2 = d.slice(-2);
  if (d.startsWith("27")) return `+27 ••• ••• ••${last2}`;
  return `+${d.slice(0, 2)} •••••${last2}`;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhoneZa(a);
  const nb = normalizePhoneZa(b);
  if (!na || !nb) return false;
  return na.e164 === nb.e164;
}

export function isSupportedRegionPhone(input: string): boolean {
  return normalizePhoneZa(input) !== null;
}

export function regionLabel(_region: PhoneRegion): string {
  return "South Africa";
}

/**
 * Build E.164 from the registration mobile field. The country code is always +27; the
 * `countryCode` argument is accepted for older callers and ignored.
 */
export function composeRegistrationPhone(
  _countryCode: string | undefined | null,
  nationalOrFull: string | undefined | null,
): NormalizedPhone | null {
  const raw = String(nationalOrFull || "").trim();
  if (!raw) return null;
  return normalizePhoneZa(raw);
}
