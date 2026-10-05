import { FacilityPatient } from "@/lib/models/FacilityPatient";
import User from "@/lib/models/User";
import Facility from "@/lib/models/Facility";
import { PatientProfile, PractitionerProfile } from "@/lib/models/RoleProfiles";
import Staff from "@/lib/models/Staff";
import { MedicalContext } from "@/lib/models/ClinicalData";
import { checkSharedRateLimit } from "@/lib/security/rateLimit";
import { normalizeFileNumber } from "@/lib/facility/fileNumber";
import { isValidId } from "@/lib/db";

export interface FileProof {
  idNumber?: string;
  dateOfBirth?: string;
  /** Doctors prove the staff number with their HPCSA registration number. */
  hpcsaNumber?: string;
}

export type FileKind = "patient" | "doctor";

export interface FileMatch {
  kind: FileKind;
  facility: { id: string; name: string };
  file: { id: string; fileNumber: string; status: string };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneE164?: string;
    hasPassword: boolean;
    emailVerified: boolean;
  };
  profile: {
    gender?: string;
    dateOfBirth?: Date;
    medicalAid?: { provider?: string; planName?: string; memberNumber?: string };
    emergencyContact?: { name?: string; phone?: string; relationship?: string };
    saId?: string;
    bloodType?: string;
    allergies?: string[];
    chronicConditions?: string[];
  } | null;
  doctor?: {
    hpcsaNumber?: string;
    specialisation?: string;
    experienceYears?: number;
    languages?: string[];
    saId?: string;
  } | null;
}

export type LookupResult =
  | { ok: true; match: FileMatch }
  | { ok: false; reason: "rate_limited" | "no_match" | "bad_input" };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const dayKey = (d: Date | string | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/**
 * Find a hospital-issued file and check the proof field against the hospital's record.
 *
 * A file number alone never reveals anything: without the SA ID number (or, when the record
 * holds none, the date of birth) every failure looks identical ("no_match"), and attempts
 * against one file number are capped so it cannot be brute-forced across many IPs.
 */
export async function lookupFile(input: {
  facilityId: unknown;
  fileNumber: unknown;
  proof: FileProof;
  kind?: FileKind;
}): Promise<LookupResult> {
  const kind: FileKind = input.kind === "doctor" ? "doctor" : "patient";
  const facilityId = String(input.facilityId ?? "");
  const fileNumber = normalizeFileNumber(input.fileNumber);
  if (!isValidId(facilityId) || !fileNumber || fileNumber.length > 60) return { ok: false, reason: "bad_input" };

  const idNumber = String(input.proof?.idNumber ?? "").replace(/\s+/g, "");
  const dob = String(input.proof?.dateOfBirth ?? "").slice(0, 10);
  const hpcsa = String(input.proof?.hpcsaNumber ?? "").replace(/\s+/g, "").toUpperCase();
  if (kind === "patient" ? !idNumber && !dob : !hpcsa) return { ok: false, reason: "bad_input" };

  const allowed = await checkSharedRateLimit(`file-lookup:${kind}:${facilityId}:${fileNumber.toLowerCase()}`, {
    windowMs: 900_000,
    maxRequests: 8,
  });
  if (!allowed) return { ok: false, reason: "rate_limited" };

  const numberFilter = { $regex: `^${escape(fileNumber)}$`, $options: "i" };
  const file =
    kind === "patient"
      ? await FacilityPatient.findOne({ facilityId, fileNumber: numberFilter, status: { $in: ["pending", "active"] } }).lean()
      : await Staff.findOne({ facilityId, fileNumber: numberFilter, status: { $in: ["pending", "active"] } }).lean();
  if (!file) return { ok: false, reason: "no_match" };

  const userId = String(kind === "patient" ? (file as any).patientId : (file as any).userId ?? "");
  if (!isValidId(userId)) return { ok: false, reason: "no_match" };
  const user = await User.findById(userId).lean();
  if (!user || user.role !== (kind === "patient" ? "patient" : "practitioner")) return { ok: false, reason: "no_match" };

  let profile: FileMatch["profile"] = null;
  let doctor: FileMatch["doctor"] = null;
  if (kind === "patient") {
    const pp = await PatientProfile.findOne({ userId }).lean();
    const recordId = (user.saId ?? pp?.idNumber ?? "").replace(/\s+/g, "");
    const proofOk = recordId
      ? idNumber !== "" && idNumber === recordId
      : dob !== "" && dob === dayKey(pp?.dateOfBirth);
    if (!proofOk) return { ok: false, reason: "no_match" };
    const ctx =
      (await MedicalContext.findOne({ patientId: userId, facilityId }).lean()) ??
      (await MedicalContext.findOne({ patientId: userId }).lean());
    profile = {
      gender: pp?.gender,
      dateOfBirth: pp?.dateOfBirth,
      medicalAid: pp?.medicalAid,
      emergencyContact: pp?.emergencyContact,
      saId: recordId || undefined,
      bloodType: ctx?.bloodType,
      allergies: (ctx?.allergies ?? []).map((a: any) => a.allergen).filter(Boolean),
      chronicConditions: ctx?.chronicConditions ?? [],
    };
  } else {
    const dp = await PractitionerProfile.findOne({ userId }).lean();
    const recordHpcsa = String(dp?.hpcsaNumber ?? "").replace(/\s+/g, "").toUpperCase();
    if (!recordHpcsa || recordHpcsa !== hpcsa) return { ok: false, reason: "no_match" };
    doctor = {
      hpcsaNumber: dp?.hpcsaNumber,
      specialisation: dp?.specialisation,
      experienceYears: dp?.experienceYears,
      languages: dp?.languages ?? [],
      saId: user.saId ?? undefined,
    };
  }

  const facility = await Facility.findById(facilityId).select("name").lean();
  return {
    ok: true,
    match: {
      kind,
      facility: { id: facilityId, name: facility?.name ?? "your hospital" },
      file: { id: String(file._id), fileNumber: String(file.fileNumber), status: String(file.status) },
      user: {
        id: userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneE164: user.phoneE164,
        hasPassword: !!user.passwordHash && !user.passwordHash.startsWith("otp_only:"),
        emailVerified: !!user.emailVerified,
      },
      profile,
      doctor,
    },
  };
}

/**
 * The hospital's record in the registration wizard's own field names, so the wizard's
 * existing steps open pre-filled. Contact details are never included: the person types
 * their email, and the server checks it against the record.
 */
export function toWizardPrefill(match: FileMatch): Record<string, unknown> {
  const out: Record<string, unknown> = {
    firstName: match.user.firstName,
    lastName: match.user.lastName,
  };
  if (match.kind === "patient" && match.profile) {
    const p = match.profile;
    Object.assign(out, {
      saId: p.saId,
      dob: p.dateOfBirth ? dayKey(p.dateOfBirth) : undefined,
      gender: p.gender,
      bloodType: p.bloodType,
      allergies: p.allergies?.length ? p.allergies : undefined,
      chronicConditions: p.chronicConditions?.length ? p.chronicConditions : undefined,
      emergencyName: p.emergencyContact?.name,
      emergencyPhone: p.emergencyContact?.phone,
      emergencyRelationship: p.emergencyContact?.relationship,
      medicalAidProvider: p.medicalAid?.provider,
      medicalAidPlan: p.medicalAid?.planName,
      medicalAidNumber: p.medicalAid?.memberNumber,
    });
  }
  if (match.kind === "doctor" && match.doctor) {
    const d = match.doctor;
    Object.assign(out, {
      fullName: `${match.user.firstName} ${match.user.lastName}`.trim(),
      hpcsaNumber: d.hpcsaNumber,
      specialization: d.specialisation,
      experience: d.experienceYears != null ? String(d.experienceYears) : undefined,
      languages: d.languages?.length ? d.languages : undefined,
      saId: d.saId,
    });
  }
  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined && v !== null && v !== ""));
}

export const maskEmailAddress = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

/**
 * The same record for a user already proven by an emailed setup link (no proof field needed).
 * Picks their most recent pending or active hospital file.
 */
export async function matchForUser(userId: string): Promise<FileMatch | null> {
  if (!isValidId(userId)) return null;
  const user = await User.findById(userId).lean();
  if (!user || (user.role !== "patient" && user.role !== "practitioner")) return null;
  const kind: FileKind = user.role === "patient" ? "patient" : "doctor";
  const file =
    kind === "patient"
      ? await FacilityPatient.findOne({ patientId: userId, status: { $in: ["pending", "active"] } }).sort({ createdAt: -1 }).lean()
      : await Staff.findOne({ userId, status: { $in: ["pending", "active"] } }).sort({ createdAt: -1 }).lean();
  if (!file) return null;
  const facilityId = String((file as any).facilityId);
  const facility = await Facility.findById(facilityId).select("name").lean();

  let profile: FileMatch["profile"] = null;
  let doctor: FileMatch["doctor"] = null;
  if (kind === "patient") {
    const pp = await PatientProfile.findOne({ userId }).lean();
    const ctx =
      (await MedicalContext.findOne({ patientId: userId, facilityId }).lean()) ??
      (await MedicalContext.findOne({ patientId: userId }).lean());
    profile = {
      gender: pp?.gender,
      dateOfBirth: pp?.dateOfBirth,
      medicalAid: pp?.medicalAid,
      emergencyContact: pp?.emergencyContact,
      saId: (user.saId ?? pp?.idNumber) || undefined,
      bloodType: ctx?.bloodType,
      allergies: (ctx?.allergies ?? []).map((a: any) => a.allergen).filter(Boolean),
      chronicConditions: ctx?.chronicConditions ?? [],
    };
  } else {
    const dp = await PractitionerProfile.findOne({ userId }).lean();
    doctor = {
      hpcsaNumber: dp?.hpcsaNumber,
      specialisation: dp?.specialisation,
      experienceYears: dp?.experienceYears,
      languages: dp?.languages ?? [],
      saId: user.saId ?? undefined,
    };
  }
  return {
    kind,
    facility: { id: facilityId, name: facility?.name ?? "your hospital" },
    file: { id: String(file._id), fileNumber: String(file.fileNumber), status: String(file.status) },
    user: {
      id: userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneE164: user.phoneE164,
      hasPassword: !!user.passwordHash && !user.passwordHash.startsWith("otp_only:"),
      emailVerified: !!user.emailVerified,
    },
    profile,
    doctor,
  };
}
