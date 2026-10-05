import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import User from "@/lib/models/User";
import Staff from "@/lib/models/Staff";
import { FacilityPatient } from "@/lib/models/FacilityPatient";
import { PatientProfile, PractitionerProfile } from "@/lib/models/RoleProfiles";
import { findLiveToken } from "@/lib/provisioning/setPassword";
import { validatePassword, validatePasswordConfirmation } from "@/lib/auth/passwordRules";
import { matchForUser, toWizardPrefill } from "@/lib/provisioning/fileLookup";
import { toId } from "@/lib/db";


/**
 * GET /api/auth/set-password?token=...
 * Used by the registration wizard when opened from the emailed setup link
 * (/register/<role>?setup=<token>). The link proves the mailbox, so the email is returned in
 * full and locked in the wizard, together with the hospital's record in the wizard's field names.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const row = await findLiveToken(token);
  if (!row) {
    return NextResponse.json({ error: "This link is invalid or has expired. Ask your hospital to send a new one." }, { status: 404 });
  }
  const match = await matchForUser(String(toId(row.userId)));
  if (!match) return NextResponse.json({ error: "This link is invalid." }, { status: 404 });
  if (match.user.hasPassword) {
    return NextResponse.json({ error: "This account is already set up. Please sign in.", code: "HAS_ACCOUNT" }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    data: {
      role: match.kind === "doctor" ? "practitioner" : "patient",
      email: match.user.email,
      hospital: match.facility,
      fileNumber: match.file.fileNumber,
      prefill: { ...toWizardPrefill(match), email: match.user.email },
    },
  });
}

/**
 * POST /api/auth/set-password
 * Body: { token, password, confirmPassword, acceptTerms, emergencyContact?, medicalAid?, bio? }
 * Sets the password, marks the email verified (the link proves the mailbox), activates the
 * account and the hospital file, and records consent.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword, acceptTerms } = body as Record<string, any>;

    const row = await findLiveToken(String(token ?? ""));
    if (!row) {
      return NextResponse.json({ error: "This link is invalid or has expired. Ask your hospital to send a new one." }, { status: 404 });
    }

    const pwError = validatePassword(String(password ?? "")) || validatePasswordConfirmation(String(password ?? ""), String(confirmPassword ?? ""));
    if (pwError) return NextResponse.json({ error: pwError }, { status: 400 });
    if (acceptTerms !== true) {
      return NextResponse.json({ error: "You must accept the terms and POPIA consent to continue." }, { status: 400 });
    }

    // Claim the token first so a double-submit cannot use it twice.
    const claimed = await (await import("@/lib/models/ProvisioningTokens")).SetPasswordToken.findOneAndUpdate(
      { _id: row._id, usedAt: { $exists: false } },
      { $set: { usedAt: new Date() } },
      { new: true },
    );
    if (!claimed) return NextResponse.json({ error: "This link has already been used." }, { status: 409 });

    const userId = toId(row.userId)!;
    const user = await User.findById(userId);
    if (!user) return NextResponse.json({ error: "This link is invalid." }, { status: 404 });

    user.passwordHash = await bcrypt.hash(String(password), await bcrypt.genSalt(10));
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.status = "active";
    user.profileCompletedAt = new Date();
    await user.save();

    const now = new Date();
    if (user.role === "patient") {
      const set: Record<string, unknown> = { popiaConsentDate: now, termsAcceptedAt: now };
      const ec = body.emergencyContact;
      if (ec && typeof ec === "object") {
        if (ec.name) set["emergencyContact.name"] = String(ec.name).slice(0, 120);
        if (ec.phone) set["emergencyContact.phone"] = String(ec.phone).slice(0, 40);
        if (ec.relationship) set["emergencyContact.relationship"] = String(ec.relationship).slice(0, 60);
      }
      const ma = body.medicalAid;
      if (ma && typeof ma === "object") {
        if (ma.provider) set["medicalAid.provider"] = String(ma.provider).slice(0, 120);
        if (ma.planName) set["medicalAid.planName"] = String(ma.planName).slice(0, 120);
        if (ma.memberNumber) set["medicalAid.memberNumber"] = String(ma.memberNumber).slice(0, 60);
      }
      await PatientProfile.updateOne({ userId }, { $set: set });
      await FacilityPatient.updateMany(
        { patientId: userId, status: "pending" },
        { $set: { status: "active", verifiedAt: now } },
      );
    } else if (user.role === "practitioner") {
      const set: Record<string, unknown> = { consentAcceptedAt: now, termsAcceptedAt: now };
      if (typeof body.bio === "string" && body.bio.trim()) set.bio = body.bio.trim().slice(0, 2000);
      await PractitionerProfile.updateOne({ userId }, { $set: set });
      await Staff.updateMany({ userId, status: "pending" }, { $set: { status: "active" } });
    }

    return NextResponse.json({ success: true, message: "Your account is ready. You can now sign in." });
  } catch (error) {
    console.error("[set-password]", error);
    return NextResponse.json({ error: "Could not set your password. Please try again." }, { status: 500 });
  }
}
