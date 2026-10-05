import { isDuplicateKeyError } from "@/lib/db";
import User from "@/lib/models/User";
import Staff from "@/lib/models/Staff";
import { PatientProfile, PractitionerProfile } from "@/lib/models/RoleProfiles";
import { MedicalContext } from "@/lib/models/ClinicalData";
import { FacilityPatient, FacilityPatientProfile } from "@/lib/models/FacilityPatient";
import type { DoctorInput, PatientInput } from "./rows";
import { issueSetPasswordToken, sendOnboardingEmail } from "./setPassword";

export type ProvisionVia = "hospital_form" | "hospital_import";

export interface ProvisionResult {
  status: "created" | "linked" | "skipped";
  userId: string;
  fileNumber: string;
  /** Set when the account was created but the onboarding email could not be sent. */
  warning?: string;
}

export class ProvisionError extends Error {}

interface Ctx {
  facility: { id: string; name: string };
  actorId: string;
  via: ProvisionVia;
  origin: string;
}

/** Best-effort removal of a half-built account after a later step failed. */
async function discard(userId: string) {
  await Staff.deleteMany({ userId }).catch(() => {});
  await User.deleteOne({ _id: userId }).catch(() => {});
}

function translate(err: unknown, what: string): never {
  if (isDuplicateKeyError(err)) {
    throw new ProvisionError(`${what} is already in use at this hospital`);
  }
  throw err;
}

/** Has this account finished onboarding (email proven, account active)? */
function isOnboarded(u: { status?: string; emailVerified?: boolean } | null | undefined): boolean {
  return !!u && u.status === "active" && !!u.emailVerified;
}

// ── patients ────────────────────────────────────────────────────────────────

export async function provisionPatient(input: PatientInput, ctx: Ctx): Promise<ProvisionResult> {
  const found = await User.find({
    $or: [{ email: input.email }, { saId: input.saId }, { phoneE164: input.mobileE164 }],
  })
    .select("email saId role status emailVerified")
    .lean();

  if (found.length > 1) {
    throw new ProvisionError("email, ID number and mobile belong to different existing accounts");
  }

  const existing = found[0];
  if (existing) {
    if (existing.role !== "patient") throw new ProvisionError("this person already has a non-patient account");
    if (existing.email !== input.email && existing.saId !== input.saId) {
      throw new ProvisionError("mobile number belongs to another account; check the email and ID number");
    }
    const userId = String(existing._id);
    const file = await FacilityPatient.findOne({ facilityId: ctx.facility.id, patientId: userId }).lean();
    if (file) {
      if (file.fileNumber.toLowerCase() === input.fileNumber.toLowerCase()) {
        return { status: "skipped", userId, fileNumber: file.fileNumber };
      }
      throw new ProvisionError(`already registered here under file number ${file.fileNumber}`);
    }
    let fp;
    try {
      fp = await FacilityPatient.create({
        facilityId: ctx.facility.id,
        patientId: userId,
        fileNumber: input.fileNumber,
        // A person still finishing onboarding gets a pending file like everyone else; it goes
        // live with their other files once they prove their email.
        ...(isOnboarded(existing) ? { status: "active", verifiedAt: new Date() } : { status: "pending" }),
        issuedBy: ctx.actorId,
      });
    } catch (err) {
      translate(err, `file number ${input.fileNumber}`);
    }
    await writeHospitalProfile(String(fp!._id), input);
    return { status: "linked", userId, fileNumber: input.fileNumber };
  }

  // brand-new person
  let userId: string | undefined;
  try {
    const user = await User.create({
      email: input.email,
      role: "patient",
      status: "pending_verification",
      firstName: input.firstName,
      lastName: input.lastName,
      saId: input.saId,
      mobile: input.mobileE164,
      phoneE164: input.mobileE164,
      emailVerified: false,
      mfaEnabled: false,
      provisionedVia: ctx.via,
      provisionedBy: ctx.actorId,
    });
    userId = String(user._id);

    await PatientProfile.create({
      userId,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      idNumber: input.saId,
      emergencyContact: input.emergencyContact,
      medicalAid: input.medicalAid,
      subscriptionTier: "free",
    });

    const fp = await FacilityPatient.create({
      facilityId: ctx.facility.id,
      patientId: userId,
      fileNumber: input.fileNumber,
      status: "pending",
      issuedBy: ctx.actorId,
    });
    await writeHospitalProfile(String(fp._id), input);

    // Health facts supplied by the hospital belong to that hospital's record.
    await MedicalContext.create({
      patientId: userId,
      facilityId: ctx.facility.id,
      bloodType: input.bloodType,
      chronicConditions: input.chronicConditions,
      currentMedications: input.currentMedications,
      familyHistory: [],
      allergies: input.allergies.map((a) => ({
        allergen: a,
        severity: "moderate",
        reaction: "Unknown",
        source: "clinician",
      })),
    });
  } catch (err) {
    if (userId) await discard(userId);
    if (isDuplicateKeyError(err)) {
      const k = Object.keys((err as { keyPattern?: object }).keyPattern ?? {})[0] ?? "identifier";
      throw new ProvisionError(`${k} is already in use`);
    }
    throw err;
  }

  const token = await issueSetPasswordToken(userId!);
  const warning = await sendOnboardingEmail({
    to: input.email,
    firstName: input.firstName,
    facilityName: ctx.facility.name,
    kind: "patient",
    fileNumber: input.fileNumber,
    token,
    origin: ctx.origin,
  });
  return { status: "created", userId: userId!, fileNumber: input.fileNumber, ...(warning ? { warning: `email not sent: ${warning}` } : {}) };
}

async function writeHospitalProfile(facilityPatientId: string, input: PatientInput) {
  await FacilityPatientProfile.create({
    facilityPatientId,
    medicalAid: input.medicalAid,
    emergencyContact: input.emergencyContact,
    referringDoctor: input.referringDoctor,
    notes: input.notes,
    details: {
      bloodType: input.bloodType,
      allergies: input.allergies,
      chronicConditions: input.chronicConditions,
      currentMedications: input.currentMedications,
    },
  });
}

// ── doctors ─────────────────────────────────────────────────────────────────

export async function provisionDoctor(input: DoctorInput, ctx: Ctx): Promise<ProvisionResult> {
  const [byIdentity, byHpcsa] = await Promise.all([
    User.find({ $or: [{ email: input.email }, { phoneE164: input.mobileE164 }] }).select("email role").lean(),
    PractitionerProfile.find({ hpcsaNumber: input.hpcsaNumber }).select("userId").lean(),
  ]);
  const ids = new Set<string>([
    ...byIdentity.map((u) => String(u._id)),
    ...byHpcsa.map((p) => String(p.userId)),
  ]);
  if (ids.size > 1) throw new ProvisionError("email, mobile and HPCSA number belong to different existing accounts");

  const hit = [...ids][0];
  if (hit) {
    const user = await User.findById(hit).select("role status emailVerified").lean();
    if (!user || user.role !== "practitioner") throw new ProvisionError("this person already has a non-practitioner account");
    const here = await Staff.findOne({ facilityId: ctx.facility.id, userId: hit }).lean();
    if (here) {
      if ((here.fileNumber ?? "").toLowerCase() === input.staffNumber.toLowerCase()) {
        return { status: "skipped", userId: hit, fileNumber: input.staffNumber };
      }
      throw new ProvisionError(`already on this hospital's staff under number ${here.fileNumber ?? "(none)"}`);
    }
    try {
      await createStaff(hit, input, ctx, isOnboarded(user) ? "active" : "pending");
    } catch (err) {
      translate(err, `staff number ${input.staffNumber}`);
    }
    return { status: "linked", userId: hit, fileNumber: input.staffNumber };
  }

  let userId: string | undefined;
  try {
    const user = await User.create({
      email: input.email,
      role: "practitioner",
      status: "pending_verification",
      firstName: input.firstName,
      lastName: input.lastName,
      mobile: input.mobileE164,
      phoneE164: input.mobileE164,
      emailVerified: false,
      mfaEnabled: false,
      provisionedVia: ctx.via,
      provisionedBy: ctx.actorId,
    });
    userId = String(user._id);

    await PractitionerProfile.create({
      userId,
      specialisation: input.specialisation,
      hpcsaNumber: input.hpcsaNumber,
      experienceYears: input.yearsExperience,
      languages: input.languages,
      isOnline: false,
    });
    await createStaff(userId, input, ctx, "pending");
  } catch (err) {
    if (userId) await discard(userId);
    if (isDuplicateKeyError(err)) {
      const k = Object.keys((err as { keyPattern?: object }).keyPattern ?? {})[0] ?? "identifier";
      throw new ProvisionError(`${k} is already in use`);
    }
    throw err;
  }

  const token = await issueSetPasswordToken(userId!);
  const warning = await sendOnboardingEmail({
    to: input.email,
    firstName: input.firstName,
    facilityName: ctx.facility.name,
    kind: "doctor",
    fileNumber: input.staffNumber,
    token,
    origin: ctx.origin,
  });
  return { status: "created", userId: userId!, fileNumber: input.staffNumber, ...(warning ? { warning: `email not sent: ${warning}` } : {}) };
}

function createStaff(userId: string, input: DoctorInput, ctx: Ctx, status: "active" | "pending") {
  return Staff.create({
    userId,
    facilityId: ctx.facility.id,
    role: input.role,
    department: input.department ?? input.specialisation,
    fileNumber: input.staffNumber,
    status,
    shiftSchedule: { start: input.shiftStart, end: input.shiftEnd, days: input.shiftDays },
    isOnDuty: false,
    hourlyRate: 0,
    qualifications: input.qualifications,
  });
}
