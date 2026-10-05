import { FacilityPatient } from "@/lib/models/FacilityPatient";
import User from "@/lib/models/User";
import Facility from "@/lib/models/Facility";
import { PatientProfile } from "@/lib/models/RoleProfiles";
import { checkSharedRateLimit } from "@/lib/security/rateLimit";
import { normalizeFileNumber } from "@/lib/facility/fileNumber";
import { isValidId } from "@/lib/db";

export interface FileProof {
  idNumber?: string;
  dateOfBirth?: string;
}

export interface FileMatch {
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
}): Promise<LookupResult> {
  const facilityId = String(input.facilityId ?? "");
  const fileNumber = normalizeFileNumber(input.fileNumber);
  if (!isValidId(facilityId) || !fileNumber || fileNumber.length > 60) return { ok: false, reason: "bad_input" };

  const idNumber = String(input.proof?.idNumber ?? "").replace(/\s+/g, "");
  const dob = String(input.proof?.dateOfBirth ?? "").slice(0, 10);
  if (!idNumber && !dob) return { ok: false, reason: "bad_input" };

  const allowed = await checkSharedRateLimit(`file-lookup:${facilityId}:${fileNumber.toLowerCase()}`, {
    windowMs: 900_000,
    maxRequests: 8,
  });
  if (!allowed) return { ok: false, reason: "rate_limited" };

  const file = await FacilityPatient.findOne({
    facilityId,
    fileNumber: { $regex: `^${escape(fileNumber)}$`, $options: "i" },
    status: { $in: ["pending", "active"] },
  }).lean();
  if (!file) return { ok: false, reason: "no_match" };

  const user = await User.findById(file.patientId).lean();
  if (!user || user.role !== "patient") return { ok: false, reason: "no_match" };
  const profile = await PatientProfile.findOne({ userId: String(user._id) }).lean();

  const recordId = (user.saId ?? profile?.idNumber ?? "").replace(/\s+/g, "");
  const proofOk = recordId
    ? idNumber !== "" && idNumber === recordId
    : dob !== "" && dob === dayKey(profile?.dateOfBirth);
  if (!proofOk) return { ok: false, reason: "no_match" };

  const facility = await Facility.findById(facilityId).select("name").lean();
  return {
    ok: true,
    match: {
      facility: { id: facilityId, name: facility?.name ?? "your hospital" },
      file: { id: String(file._id), fileNumber: file.fileNumber, status: file.status },
      user: {
        id: String(user._id),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneE164: user.phoneE164,
        hasPassword: !!user.passwordHash && !user.passwordHash.startsWith("otp_only:"),
        emailVerified: !!user.emailVerified,
      },
      profile: profile
        ? {
            gender: profile.gender,
            dateOfBirth: profile.dateOfBirth,
            medicalAid: profile.medicalAid,
            emergencyContact: profile.emergencyContact,
          }
        : null,
    },
  };
}

export const maskEmailAddress = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");
