import { normalizePhoneZaSz } from "@/lib/phone/normalizePhone";
import { isValidEmail, normalizeEmail } from "@/lib/supabase/auth";
import { normalizeFileNumber } from "@/lib/facility/fileNumber";
import type { ImportKind } from "./columns";

export interface PatientInput {
  fileNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  saId: string;
  dateOfBirth: Date;
  gender: "male" | "female" | "other";
  mobileE164: string;
  medicalAid: { provider?: string; planName?: string; memberNumber?: string };
  emergencyContact: { name?: string; phone?: string; relationship?: string };
  bloodType?: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  referringDoctor?: string;
  notes?: string;
}

export interface DoctorInput {
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  mobileE164: string;
  hpcsaNumber: string;
  specialisation: string;
  role: "doctor" | "nurse" | "technician" | "admin";
  department?: string;
  qualifications: string[];
  languages: string[];
  yearsExperience: number;
  shiftStart: string;
  shiftEnd: string;
  shiftDays: number[];
}

export type RawRow = Record<string, unknown>;
export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const str = (v: unknown) => String(v ?? "").trim();
const list = (v: unknown) =>
  str(v)
    .split(/[;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
const opt = (v: unknown) => str(v) || undefined;

const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const DAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

/** Parse a date cell: ISO string, Date, or Excel serial number. */
function parseDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === "number" && Number.isFinite(v) && v > 20000 && v < 80000) {
    return new Date(Math.round((v - 25569) * 86400 * 1000)); // Excel serial -> UTC
  }
  const s = str(v);
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

export function validPatientRow(raw: RawRow): Parsed<PatientInput> {
  const errors: string[] = [];
  const fileNumber = normalizeFileNumber(raw.file_number);
  if (!fileNumber) errors.push("file_number is required");
  const firstName = str(raw.first_name);
  const lastName = str(raw.last_name);
  if (!firstName) errors.push("first_name is required");
  if (!lastName) errors.push("last_name is required");

  const email = normalizeEmail(str(raw.email));
  if (!email || !isValidEmail(email)) errors.push("email is missing or invalid");

  const saId = str(raw.id_number).replace(/\s+/g, "");
  const idDob = dobFromSaId(saId);
  if (!/^\d{13}$/.test(saId)) errors.push("id_number must be 13 digits");
  else if (!idDob) errors.push("id_number does not contain a valid date of birth");

  const dob = parseDate(raw.date_of_birth);
  if (!dob) errors.push("date_of_birth must be YYYY-MM-DD");
  else if (idDob && dob.getTime() !== idDob.getTime()) errors.push("date_of_birth does not match id_number");

  const gender = str(raw.gender).toLowerCase();
  if (!["male", "female", "other"].includes(gender)) errors.push("gender must be male, female or other");

  const phone = normalizePhoneZaSz(str(raw.mobile));
  if (!phone) errors.push("mobile must be a South Africa (+27) or Eswatini (+268) number");

  const blood = str(raw.blood_type).toUpperCase();
  if (blood && !BLOOD.includes(blood)) errors.push("blood_type must be one of " + BLOOD.join(", "));

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      fileNumber, firstName, lastName, email, saId,
      dateOfBirth: dob!, gender: gender as PatientInput["gender"], mobileE164: phone!.e164,
      medicalAid: { provider: opt(raw.medical_aid_provider), planName: opt(raw.medical_aid_plan), memberNumber: opt(raw.medical_aid_member_number) },
      emergencyContact: { name: opt(raw.emergency_contact_name), phone: opt(raw.emergency_contact_phone), relationship: opt(raw.emergency_contact_relationship) },
      bloodType: blood || undefined,
      allergies: list(raw.allergies),
      chronicConditions: list(raw.chronic_conditions),
      currentMedications: list(raw.current_medications),
      referringDoctor: opt(raw.referring_doctor),
      notes: opt(raw.notes),
    },
  };
}

export function validDoctorRow(raw: RawRow): Parsed<DoctorInput> {
  const errors: string[] = [];
  const staffNumber = normalizeFileNumber(raw.staff_number);
  if (!staffNumber) errors.push("staff_number is required");
  const firstName = str(raw.first_name);
  const lastName = str(raw.last_name);
  if (!firstName) errors.push("first_name is required");
  if (!lastName) errors.push("last_name is required");

  const email = normalizeEmail(str(raw.email));
  if (!email || !isValidEmail(email)) errors.push("email is missing or invalid");

  const phone = normalizePhoneZaSz(str(raw.mobile));
  if (!phone) errors.push("mobile must be a South Africa (+27) or Eswatini (+268) number");

  const hpcsaNumber = str(raw.hpcsa_number).toUpperCase().replace(/\s+/g, "");
  if (!hpcsaNumber) errors.push("hpcsa_number is required");
  const specialisation = str(raw.specialisation);
  if (!specialisation) errors.push("specialisation is required");

  const role = (str(raw.role).toLowerCase() || "doctor") as DoctorInput["role"];
  if (!["doctor", "nurse", "technician", "admin"].includes(role)) errors.push("role must be doctor, nurse, technician or admin");

  const years = str(raw.years_experience);
  if (years && !/^\d{1,2}$/.test(years)) errors.push("years_experience must be a whole number");

  const shiftStart = str(raw.shift_start) || "08:00";
  const shiftEnd = str(raw.shift_end) || "16:00";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(shiftStart)) errors.push("shift_start must be HH:MM");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(shiftEnd)) errors.push("shift_end must be HH:MM");

  const dayNames = list(raw.shift_days);
  const shiftDays: number[] = [];
  for (const d of dayNames) {
    const n = DAYS[d.slice(0, 3).toLowerCase()];
    if (n === undefined) errors.push(`shift_days: "${d}" is not a day (use Mon;Tue;...)`);
    else if (!shiftDays.includes(n)) shiftDays.push(n);
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      staffNumber, firstName, lastName, email, mobileE164: phone!.e164, hpcsaNumber, specialisation, role,
      department: opt(raw.department),
      qualifications: list(raw.qualifications),
      languages: list(raw.languages).length ? list(raw.languages) : ["English"],
      yearsExperience: years ? Number(years) : 0,
      shiftStart, shiftEnd,
      shiftDays: shiftDays.length ? shiftDays : [1, 2, 3, 4, 5],
    },
  };
}

export function validateRow(kind: ImportKind, raw: RawRow) {
  return kind === "patients" ? validPatientRow(raw) : validDoctorRow(raw);
}
