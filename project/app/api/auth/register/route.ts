import { NextResponse } from "next/server";
import User from "@/lib/models/User";
import {
  PatientProfile,
  PractitionerProfile,
  HospitalAdminProfile,
} from "@/lib/models/RoleProfiles";
import { Anthropometric, MedicalContext } from "@/lib/models/ClinicalData";
import Facility from "@/lib/models/Facility";
import Staff from "@/lib/models/Staff";
import StaffInvite from "@/lib/models/StaffInvite";
import bcrypt from "bcryptjs";
import { normalizeEmail } from "@/lib/supabase/auth";
import { composeRegistrationPhone } from "@/lib/phone/normalizePhone";
import { ClaimError, claimRegistration } from "@/lib/provisioning/claimRegistration";

/**
 * POST /api/auth/register
 * Creates Digi-Health account (password). No email verification step —
 * the account is active immediately and can log in right away.
 *
 * Body: { role, formData }
 * Does NOT issue a session JWT — user logs in separately after registering.
 */
export async function POST(request: Request) {
  try {
    const { role: wizardRole, formData } = await request.json();

    if (!wizardRole || !formData) {
      return NextResponse.json(
        { error: "Missing registration data" },
        { status: 400 },
      );
    }

    // Patients and doctors complete the record their hospital loaded (file number / staff
    // number, or the emailed setup link). Only a hospital can create a new account here.
    if (wizardRole === "patient" || wizardRole === "practitioner") {
      try {
        const done = await claimRegistration(wizardRole, formData);
        try {
          const regToken = formData.registrationMediaToken || formData.registrationToken;
          const { claimRegistrationMedia, promoteToAvatar } = await import("@/lib/supabase/media");
          if (regToken) await claimRegistrationMedia(String(regToken), done.userId);
          await promoteToAvatar(done.userId, formData.profilePhoto);
        } catch (e) {
          console.warn("[register] media claim skipped:", e);
        }
        if (done.emailProven) {
          return NextResponse.json({
            success: true,
            message: "Your health profile is complete. You can now sign in.",
            requiresVerification: false,
            next: "/login?setup=done",
            email: done.email,
          });
        }
        try {
          const { issueOtpCode } = await import("@/lib/auth/otp");
          await issueOtpCode({ userId: done.userId, email: done.email, firstName: done.firstName });
        } catch (e) {
          console.warn("[register] verification code send skipped:", e);
        }
        return NextResponse.json({
          success: true,
          message: "Check your email for a verification code.",
          requiresVerification: true,
          email: done.email,
        });
      } catch (err) {
        if (err instanceof ClaimError) {
          return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
        }
        throw err;
      }
    }
    if (wizardRole !== "hospital") {
      return NextResponse.json({ error: "Unknown registration type" }, { status: 400 });
    }

    const formEmail = normalizeEmail(
      formData.email || formData.adminEmail || "",
    );

    if (!formEmail || !formEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    const existingUser = await User.findOne({
      $or: [
        { email: formEmail },
        formData.saId ? { saId: formData.saId } : null,
      ].filter(Boolean) as any[],
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or SA ID already exists" },
        { status: 409 },
      );
    }

    if (!formData.password || String(formData.password).length < 8) {
      return NextResponse.json(
        { error: "A password of at least 8 characters is required." },
        { status: 400 },
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(String(formData.password), salt);

    const phone = composeRegistrationPhone(
      formData.countryCode,
      formData.mobile,
    );
    if (formData.mobile && !phone) {
      return NextResponse.json(
        {
          error:
            "Invalid mobile number. Use a South African mobile number (+27).",
        },
        { status: 400 },
      );
    }

    let modelRole: string = wizardRole;
    if (wizardRole === "hospital") modelRole = "hospital_admin";

    const newUser = await User.create({
      email: formEmail,
      passwordHash,
      role: modelRole as any,
      firstName:
        formData.firstName ||
        formData.fullName?.split(" ")[0] ||
        formData.adminName?.split(" ")[0] ||
        "User",
      lastName:
        formData.lastName ||
        formData.fullName?.split(" ").slice(1).join(" ") ||
        formData.adminName?.split(" ").slice(1).join(" ") ||
        "Registry",
      saId: formData.saId,
      mobile: phone?.e164 || formData.mobile,
      phoneE164: phone?.e164,
      status: "pending_verification" as any,
      emailVerified: false,
      mfaEnabled: false,
    } as any);

    try {
      const regToken =
        formData.registrationMediaToken ||
        formData.registrationToken ||
        undefined;
      const { claimRegistrationMedia, promoteToAvatar } = await import("@/lib/supabase/media");
      if (regToken) await claimRegistrationMedia(String(regToken), newUser._id.toString());
      await promoteToAvatar(newUser._id.toString(), formData.profilePhoto);
    } catch (e) {
      console.warn("[register] media claim skipped:", e);
    }

    // Platform-admin invite acceptance (User Management -> "Invite user"):
    // works the same way regardless of role, unlike the practitioner-only
    // StaffInvite acceptance below, since a platform invite doesn't attach
    // the new account to anything else — it just confirms the invite was
    // used. Never blocks account creation.
    if (formData.adminInviteToken) {
      try {
        const { default: PlatformInvite } = await import(
          "@/lib/models/PlatformInvite"
        );
        const invite = await PlatformInvite.findOne({
          token: formData.adminInviteToken,
          status: "pending",
        });
        if (invite && invite.expiresAt > new Date() && invite.email === formEmail) {
          invite.status = "accepted";
          invite.acceptedAt = new Date();
          await invite.save();
        }
      } catch (e) {
        console.warn("[register] platform invite acceptance skipped:", e);
      }
    }

    if (wizardRole === "patient") {
      const patientProfile = await PatientProfile.create({
        userId: newUser._id,
        dateOfBirth: formData.dob ? new Date(formData.dob) : new Date(),
        gender: formData.gender?.toLowerCase() || "other",
        // Left undefined rather than filled with "N/A". A placeholder string is
        // truthy, so every downstream "is there a contact?" check passed and
        // clinicians were shown an Emergency Line card reading N/A — which in a
        // clinical sidebar looks like a number that could be called.
        emergencyContact: {
          name: formData.emergencyName || undefined,
          phone: formData.emergencyPhone || undefined,
          relationship: formData.emergencyRelationship || undefined,
        },
        popiaConsentDate: new Date(),
        termsAcceptedAt: new Date(),
        subscriptionTier: "pro",
        profilePhoto: formData.profilePhoto,
        medicalDocuments: Array.isArray(formData.medicalDocuments)
          ? formData.medicalDocuments
          : [],
      });

      if (formData.heightCm || formData.weightKg) {
        const height = parseFloat(formData.heightCm) || 0;
        const weight = parseFloat(formData.weightKg) || 0;
        const bmi =
          height > 0 ? (weight / (height / 100) ** 2).toFixed(1) : 0;

        await Anthropometric.create({
          patientId: newUser._id,
          heightCm: height,
          weightKg: weight,
          bmi: parseFloat(bmi as string),
          bloodType: formData.bloodType || "Unknown",
          dateRecorded: new Date(),
        });
      }

      // Written unconditionally, unlike the Anthropometric record above which
      // only exists when a measurement was supplied. Blood type and activity
      // level are facts about the patient, not measurements, so they must not
      // depend on whether height or weight happened to be filled in.
      await MedicalContext.create({
        patientId: newUser._id,
        bloodType: formData.bloodType || undefined,
        activityLevel: formData.activityLevel || undefined,
        chronicConditions: formData.chronicConditions || [],
        allergies: (formData.allergies || []).map((a: string) => ({
          allergen: a,
          severity: "moderate",
          reaction: "Unknown",
          source: "patient",
        })),
        currentMedications: [],
        familyHistory: [],
      });

      // Attach to an inviting family.
      //
      // Two ways in: the emailed link (which carries the token and locks the
      // address), or the invitee registering independently and answering the
      // prompt at the review step. In both cases the invite is matched
      // server-side on the registered address — the client never supplies the
      // token from the second path, so a pending invite cannot be claimed by
      // typing someone else's address into a form.
      const wantsFamily =
        !!formData.familyInviteToken || formData.joinFamily === true;

      if (wantsFamily) {
        try {
          const { default: FamilyLink } = await import("@/lib/models/FamilyLink");
          const query: Record<string, unknown> = {
            inviteEmail: formEmail,
            status: "pending",
          };
          if (formData.familyInviteToken) {
            query.inviteToken = formData.familyInviteToken;
          }

          const invite = await FamilyLink.findOne(query).sort({ createdAt: -1 });
          const notExpired =
            invite &&
            (!invite.inviteExpiresAt ||
              new Date(invite.inviteExpiresAt) > new Date());

          if (invite && notExpired) {
            invite.memberId = newUser._id;
            invite.status = "active";
            invite.acceptedAt = new Date();
            invite.inviteToken = undefined;
            await invite.save();
          }
        } catch (err) {
          // The account is already created; a failed link must not fail the
          // registration. The guardian's invite simply stays pending.
          console.error("[register] family link failed", err);
        }
      } else if (formData.joinFamily === false) {
        // Declined at the review step — retire the invite rather than leaving
        // the guardian looking at one that will never be answered.
        try {
          const { default: FamilyLink } = await import("@/lib/models/FamilyLink");
          await FamilyLink.updateMany(
            { inviteEmail: formEmail, status: "pending" },
            { status: "revoked", revokedAt: new Date() },
          );
        } catch (err) {
          console.error("[register] declining family invite failed", err);
        }
      }
    } else if (wizardRole === "practitioner") {
      const practitionerProfile = await PractitionerProfile.create({
        userId: newUser._id,
        specialisation: formData.specialization || "General Practitioner",
        hpcsaNumber: formData.hpcsaNumber || "N/A",
        experienceYears: parseInt(formData.experience) || 0,
        profilePhoto: formData.profilePhoto,
        hpcsaCertificate: formData.hpcsaCert,
        bankAccount: {
          accountHolder: formData.bankHolder,
          bankName: formData.bankName,
          accountNumber: formData.bankAccount,
        },
        address: {
          street: formData.street,
          city: formData.city,
          province: formData.province,
        },
        languages: formData.languages || ["English"],
        isOnline: false,
        // bgCheckConsent and practitionerConsent are collected together on
        // the same step, so one timestamp covers both.
        consentAcceptedAt:
          formData.bgCheckConsent || formData.practitionerConsent
            ? new Date()
            : undefined,
        termsAcceptedAt: formData.practitionerTermsAccepted
          ? new Date()
          : undefined,
      });

      // Hospital-admin invite acceptance: auto-attach to the inviting
      // facility's Staff roster when this registration came from a valid,
      // unexpired invite for this exact email. Never blocks account
      // creation — a bad/stale token just means no auto-attachment.
      if (formData.inviteToken) {
        try {
          const invite = await StaffInvite.findOne({
            token: formData.inviteToken,
            status: "pending",
          });
          if (
            invite &&
            invite.expiresAt > new Date() &&
            invite.email === formEmail
          ) {
            const newStaff = await Staff.create({
              userId: newUser._id,
              facilityId: invite.facilityId,
              role: "doctor",
              department: formData.specialization || "General Practitioner",
              shiftSchedule: {
                start: invite.shiftStart,
                end: invite.shiftEnd,
                days: [1, 2, 3, 4, 5],
              },
              isOnDuty: false,
              hourlyRate: invite.hourlyRate,
            });

            invite.status = "accepted";
            invite.acceptedAt = new Date();
            await invite.save();
          }
        } catch (e) {
          console.warn("[register] staff invite acceptance skipped:", e);
        }
      }
    } else if (wizardRole === "hospital") {
      const newFacility = await Facility.create({
        name: formData.facilityName,
        facilityType:
          formData.facilityType === "NGO / Clinic"
            ? "NGO"
            : formData.facilityType === "Private"
              ? "Private"
              : "Public",
        address: {
          street: formData.street,
          city: formData.city,
          province: formData.province,
        },
        contactInfo: {
          phone: formData.mobile || "",
          email: formData.adminEmail,
        },
        bedCapacity: {
          total: parseInt(formData.bedCapacity) || 0,
          generalAvailable: parseInt(formData.bedCapacity) || 0,
          icuAvailable: 0,
        },
        isOpen: true,
        logo: formData.facilityLogo,
        wallpaper: formData.facilityWallpaper,
        regCertificate: formData.regCertificate,
      });

      const adminProfile = await HospitalAdminProfile.create({
        userId: newUser._id,
        hospitalId: newFacility._id,
        department: "Administration",
        permissions: ["all"],
      });
    }

    // Every new account must confirm ownership of their email via a 6-digit
    // code before they can sign in. Non-fatal — a failed send just means
    // the verify-email page's own "resend" button can retry.
    try {
      const { issueOtpCode } = await import("@/lib/auth/otp");
      await issueOtpCode({
        userId: newUser._id.toString(),
        email: formEmail,
        firstName: newUser.firstName,
      });
    } catch (e) {
      console.warn("[register] verification code send skipped:", e);
    }

    // Internal notification — lets the team see sign-ups as they happen.
    // Non-fatal: a failed send here must never fail the registration itself.
    try {
      const { sendEmail } = await import("@/lib/email/resend");
      const { newSignupNotificationEmailHtml } = await import(
        "@/lib/email/templates/newSignupNotification"
      );
      await sendEmail({
        to: "info@digi-health.co.za",
        subject: `New ${modelRole} sign-up: ${newUser.firstName} ${newUser.lastName}`,
        html: newSignupNotificationEmailHtml({
          fullName: `${newUser.firstName} ${newUser.lastName}`,
          email: formEmail,
          phone: newUser.mobile,
          role: modelRole,
        }),
      });
    } catch (e) {
      console.warn("[register] admin sign-up notification skipped:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Check your email for a verification code.",
      requiresVerification: true,
      userId: newUser._id.toString(),
      email: formEmail,
      user: {
        id: newUser._id.toString(),
        role: newUser.role,
        email: formEmail,
        firstName: newUser.firstName,
        emailVerified: false,
      },
    });
  } catch (error: any) {
    console.error("Registration Error:", error);
    if (/phone_e164/.test(String(error?.message))) {
      return NextResponse.json(
        { error: "This mobile number is already used by another account.", code: "MOBILE_TAKEN" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      {
        error: "Registration failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
