import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import Staff from "@/lib/models/Staff";
import { FacilityPatient } from "@/lib/models/FacilityPatient";
import { PatientProfile, PractitionerProfile } from "@/lib/models/RoleProfiles";
import { Anthropometric, MedicalContext } from "@/lib/models/ClinicalData";
import { SetPasswordToken } from "@/lib/models/ProvisioningTokens";
import { normalizeEmail } from "@/lib/supabase/auth";
import { composeRegistrationPhone } from "@/lib/phone/normalizePhone";
import { validatePassword } from "@/lib/auth/passwordRules";
import { findLiveToken } from "./setPassword";
import { lookupFile } from "./fileLookup";
import { toId } from "@/lib/db";
import AuditLog from "@/lib/models/AuditLog";

export class ClaimError extends Error {
  constructor(message: string, public status = 400, public code?: string) {
    super(message);
  }
}

type Form = Record<string, any>;

/**
 * Registration for a person their hospital already loaded. The wizard proves who they are
 * either with the hospital file/staff number plus a proof field (`fileClaim`) or with the
 * emailed setup link (`setupToken`). The existing user row is completed, never duplicated.
 *
 * Returns whether the email is already proven (setup link) so the caller can skip the OTP.
 */
export async function claimRegistration(
  wizardRole: "patient" | "practitioner",
  formData: Form,
): Promise<{ userId: string; email: string; firstName: string; emailProven: boolean }> {
  const kind = wizardRole === "patient" ? "patient" : "doctor";
  let userId: string;
  let emailProven = false;
  let tokenRowId: string | null = null;

  if (formData.setupToken) {
    const row = await findLiveToken(String(formData.setupToken));
    if (!row) throw new ClaimError("This setup link is invalid or has expired. Ask your hospital to send a new one.", 404);
    userId = String(toId(row.userId));
    tokenRowId = String(row._id);
    emailProven = true;
  } else if (formData.fileClaim && typeof formData.fileClaim === "object") {
    const c = formData.fileClaim;
    const r = await lookupFile({
      kind,
      facilityId: c.facilityId,
      fileNumber: c.fileNumber,
      proof: { idNumber: c.idNumber, dateOfBirth: c.dateOfBirth, hpcsaNumber: c.hpcsaNumber },
    });
    if (!r.ok) {
      throw new ClaimError(
        r.reason === "rate_limited" ? "Too many attempts. Try again in 15 minutes." : "We couldn't verify your hospital number. Go back to step 1.",
        r.reason === "rate_limited" ? 429 : 403,
      );
    }
    userId = r.match.user.id;
  } else {
    throw new ClaimError(
      wizardRole === "patient"
        ? "Patients register with their hospital file number. Choose your hospital and enter your file number."
        : "Doctors register with the staff number their hospital issued. Choose your hospital and enter your staff number.",
      403,
      "FILE_NUMBER_REQUIRED",
    );
  }

  const user = await User.findById(userId);
  if (!user || user.role !== wizardRole) throw new ClaimError("We couldn't find your hospital record.", 404);
  if (user.passwordHash && !String(user.passwordHash).startsWith("otp_only:")) {
    throw new ClaimError("This account is already set up. Please sign in.", 409, "HAS_ACCOUNT");
  }

  const email = normalizeEmail(formData.email || "");
  if (!email || email !== normalizeEmail(user.email)) {
    throw new ClaimError("Use the email address your hospital has on file for you.", 400, "EMAIL_MISMATCH");
  }

  if (wizardRole === "practitioner" && formData.settlementTermsAccepted !== true) {
    throw new ClaimError("Please confirm the Payments & Settlements terms to finish registering.", 400, "SETTLEMENT_TERMS_REQUIRED");
  }

  const pwError = validatePassword(String(formData.password ?? ""));
  if (pwError) throw new ClaimError(pwError, 400);

  const phone = formData.mobile ? composeRegistrationPhone(formData.countryCode, formData.mobile) : null;
  if (formData.mobile && !phone) {
    throw new ClaimError("Invalid mobile number. Use a South African mobile number (+27).", 400);
  }

  // Each mobile number belongs to one account. Say so plainly instead of failing on the
  // database's unique index.
  if (phone && phone.e164 !== user.phoneE164) {
    const taken = await User.findOne({ phoneE164: phone.e164, _id: { $ne: userId } }).select("_id").lean();
    if (taken) {
      throw new ClaimError(
        "This mobile number is already used by another account. Use your own mobile number, or the one your hospital has on file.",
        409,
        "MOBILE_TAKEN",
      );
    }
  }

  // Claim the setup link first so a double submit cannot use it twice.
  if (tokenRowId) {
    const claimed = await SetPasswordToken.findOneAndUpdate(
      { _id: tokenRowId, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
    if (!claimed) throw new ClaimError("This setup link has already been used.", 409);
  }

  const now = new Date();
  user.passwordHash = await bcrypt.hash(String(formData.password), await bcrypt.genSalt(10));
  const first = formData.firstName || formData.fullName?.split(" ")[0];
  const last = formData.lastName || formData.fullName?.split(" ").slice(1).join(" ");
  if (first) user.firstName = String(first).slice(0, 80);
  if (last) user.lastName = String(last).slice(0, 80);
  if (phone) {
    user.mobile = phone.e164;
    user.phoneE164 = phone.e164;
  }
  user.profileCompletedAt = now;
  if (emailProven) {
    user.emailVerified = true;
    user.emailVerifiedAt = now;
    user.status = "active";
  } else {
    user.status = "pending_verification" as any;
  }
  await user.save();

  if (wizardRole === "patient") {
    const set: Record<string, unknown> = { popiaConsentDate: now, termsAcceptedAt: now };
    if (formData.dob) set.dateOfBirth = new Date(formData.dob);
    if (formData.gender) set.gender = String(formData.gender).toLowerCase();
    if (formData.emergencyName) set["emergencyContact.name"] = formData.emergencyName;
    if (formData.emergencyPhone) set["emergencyContact.phone"] = formData.emergencyPhone;
    if (formData.emergencyRelationship) set["emergencyContact.relationship"] = formData.emergencyRelationship;
    if (formData.profilePhoto) set.profilePhoto = formData.profilePhoto;
    if (Array.isArray(formData.medicalDocuments)) set.medicalDocuments = formData.medicalDocuments;
    await PatientProfile.updateOne({ userId }, { $set: set });

    if (formData.heightCm || formData.weightKg) {
      const height = parseFloat(formData.heightCm) || 0;
      const weight = parseFloat(formData.weightKg) || 0;
      await Anthropometric.create({
        patientId: userId,
        heightCm: height,
        weightKg: weight,
        bmi: height > 0 ? parseFloat((weight / (height / 100) ** 2).toFixed(1)) : 0,
        bloodType: formData.bloodType || "Unknown",
        dateRecorded: now,
      });
    }

    // What the patient enters is their own record (no hospital), next to the hospital's copy.
    const own = {
      bloodType: formData.bloodType || undefined,
      activityLevel: formData.activityLevel || undefined,
      chronicConditions: Array.isArray(formData.chronicConditions) ? formData.chronicConditions : [],
      allergies: (Array.isArray(formData.allergies) ? formData.allergies : []).map((a: string) => ({
        allergen: a,
        severity: "moderate",
        reaction: "Unknown",
        source: "patient",
      })),
    };
    const existing = await MedicalContext.findOne({ patientId: userId, facilityId: null });
    if (existing) {
      Object.assign(existing, own);
      await existing.save();
    } else {
      await MedicalContext.create({ patientId: userId, ...own, currentMedications: [], familyHistory: [] });
    }
  } else {
    const set: Record<string, unknown> = {};
    if (formData.specialization) set.specialisation = formData.specialization;
    if (formData.experience) set.experienceYears = parseInt(formData.experience) || 0;
    if (formData.profilePhoto) set.profilePhoto = formData.profilePhoto;
    if (formData.hpcsaCert) set.hpcsaCertificate = formData.hpcsaCert;
    if (formData.street) set["address.street"] = formData.street;
    if (formData.city) set["address.city"] = formData.city;
    if (formData.province) set["address.province"] = formData.province;
    if (Array.isArray(formData.languages) && formData.languages.length) set.languages = formData.languages;
    if (formData.bgCheckConsent || formData.practitionerConsent) set.consentAcceptedAt = now;
    if (formData.practitionerTermsAccepted) set.termsAcceptedAt = now;
    if (Object.keys(set).length) await PractitionerProfile.updateOne({ userId }, { $set: set });
    // Record the settlement confirmation with the exact wording that was shown.
    const { SETTLEMENT_CONFIRMATION_TEXT } = await import("@/components/auth/Register/Steps/Practitioner/settlementText");
    await AuditLog.create({
      actorId: userId,
      actorRole: "practitioner",
      actorEmail: email,
      action: "practitioner.settlement_terms_accepted",
      targetType: "user",
      targetId: userId,
      metadata: { acceptedAt: now.toISOString(), text: SETTLEMENT_CONFIRMATION_TEXT },
    });
  }

  if (emailProven) await activateHospitalRecords(userId);

  return { userId, email, firstName: user.firstName, emailProven };
}

/** Pending hospital files and staff rows go live once the person has proven their email. */
export async function activateHospitalRecords(userId: string) {
  const now = new Date();
  await FacilityPatient.updateMany({ patientId: userId, status: "pending" }, { $set: { status: "active", verifiedAt: now } });
  await Staff.updateMany({ userId, status: "pending" }, { $set: { status: "active" } });
}
