/**
 * Phone normalisation for DigiHealth MFA.
 * Supported regions: South Africa (+27) and Eswatini (+268).
 */

export type PhoneRegion = "ZA" | "SZ";

export interface NormalizedPhone {
  e164: string;
  region: PhoneRegion;
  national: string;
  masked: string;
}

/** Strip spaces, dashes, parentheses */
function digitsOnly(input: string): string {
  return String(input || "").replace(/[^\d+]/g, "");
}

/**
 * Normalise user-entered mobile to E.164.
 * Accepts:
 *  ZA: +27…, 27…, 0XXXXXXXXX (9 digits after 0)
 *  SZ: +268…, 268…, 0XXXXXXXX (often 8 digits after country / local)
 */
export function normalizePhoneZaSz(
  input: string,
): NormalizedPhone | null {
  if (!input?.trim()) return null;

  let raw = digitsOnly(input.trim());

  // Keep leading + for detection then strip non-digits for processing
  const hasPlus = raw.startsWith("+");
  let d = raw.replace(/\D/g, "");

  // South Africa: 27 + 9 digits (mobile typically 6/7/8)
  if (d.startsWith("27") && d.length === 11) {
    const national = d.slice(2);
    if (!/^[6-8]\d{8}$/.test(national) && !/^\d{9}$/.test(national)) {
      // allow any 9-digit national after 27 for landline edge cases in MFA enroll
    }
    return formatResult("ZA", national, `+27${national}`);
  }

  // Local SA: 0 + 9 digits
  if (d.startsWith("0") && d.length === 10 && !d.startsWith("00")) {
    // Could be ZA (0 + 9) — Eswatini local is often 0 + 7/8
    // Prefer ZA when 10 digits starting with 0
    const national = d.slice(1);
    if (national.length === 9) {
      return formatResult("ZA", national, `+27${national}`);
    }
  }

  // Eswatini: 268 + 8 digits
  if (d.startsWith("268") && d.length === 11) {
    const national = d.slice(3);
    return formatResult("SZ", national, `+268${national}`);
  }

  // Eswatini sometimes written without trunk 0: 7/8 digit national with country
  if (d.startsWith("268") && (d.length === 10 || d.length === 11 || d.length === 12)) {
    const national = d.slice(3);
    if (national.length >= 7 && national.length <= 9) {
      return formatResult("SZ", national, `+268${national}`);
    }
  }

  // Local Eswatini: 0 + 7 or 8 digits (common mobiles 76/78/79…)
  if (d.startsWith("0") && (d.length === 8 || d.length === 9)) {
    const national = d.slice(1);
    // Heuristic: SZ mobiles often start with 7
    if (/^7\d{6,7}$/.test(national)) {
      return formatResult("SZ", national, `+268${national}`);
    }
  }

  // Bare national ZA (9 digits starting 6-8)
  if (/^[6-8]\d{8}$/.test(d)) {
    return formatResult("ZA", d, `+27${d}`);
  }

  // Bare national SZ (8 digits starting 7)
  if (/^7\d{7}$/.test(d)) {
    return formatResult("SZ", d, `+268${d}`);
  }

  // With explicit + already processed via digits — try hasPlus length checks
  if (hasPlus) {
    if (d.startsWith("27") && d.length >= 11) {
      const national = d.slice(2, 11);
      return formatResult("ZA", national, `+27${national}`);
    }
    if (d.startsWith("268") && d.length >= 11) {
      const national = d.slice(3);
      return formatResult("SZ", national, `+268${national}`);
    }
  }

  return null;
}

function formatResult(
  region: PhoneRegion,
  national: string,
  e164: string,
): NormalizedPhone {
  const masked = maskE164(e164);
  return { e164, region, national, masked };
}

export function maskE164(e164: string): string {
  const d = e164.replace(/\D/g, "");
  if (d.length < 6) return "••••••••";
  const last2 = d.slice(-2);
  if (d.startsWith("27")) return `+27 ••• ••• ••${last2}`;
  if (d.startsWith("268")) return `+268 ••• ••${last2}`;
  return `+${d.slice(0, 3)} •••••${last2}`;
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhoneZaSz(a);
  const nb = normalizePhoneZaSz(b);
  if (!na || !nb) return false;
  return na.e164 === nb.e164;
}

export function isSupportedRegionPhone(input: string): boolean {
  return normalizePhoneZaSz(input) !== null;
}

export function regionLabel(region: PhoneRegion): string {
  return region === "ZA" ? "South Africa" : "Eswatini";
}

/**
 * Build E.164 from registration country-code selector + national digits.
 * Supports ZA (+27) and Eswatini / Swazi (+268).
 */
export function composeRegistrationPhone(
  countryCode: string | undefined | null,
  nationalOrFull: string | undefined | null,
): NormalizedPhone | null {
  const raw = String(nationalOrFull || "").trim();
  if (!raw) return null;

  // Already international
  if (raw.startsWith("+") || raw.replace(/\D/g, "").match(/^(27|268)/)) {
    return normalizePhoneZaSz(raw);
  }

  let national = raw.replace(/\D/g, "");
  // Drop trunk 0 when user typed local format into the national field
  if (national.startsWith("0")) national = national.slice(1);

  const cc = String(countryCode || "+27").trim();
  if (cc === "+268" || cc === "268") {
    return normalizePhoneZaSz(`+268${national}`);
  }
  // Default South Africa
  return normalizePhoneZaSz(`+27${national}`);
}
