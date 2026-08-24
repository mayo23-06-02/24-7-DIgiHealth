import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
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
import {
  syncUser,
  syncPatientProfile,
  syncPractitionerProfile,
  syncHospitalAdminProfile,
} from "@/lib/postgres/users";
import { syncFacility, syncStaff, updateStaffInviteByMongoId } from "@/lib/postgres/facility";

/**
 * POST /api/auth/register
 * Creates DigiHealth account (password). No email verification step —
 * the account is active immediately and can log in right away.
 *
 * Body: { role, formData }
 * Does NOT issue a session JWT — user logs in separately after registering.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { role: wizardRole, formData } = await request.json();

    if (!wizardRole || !formData) {
      return NextResponse.json(
        { error: "Missing registration data" },
        { status: 400 },
      );
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
            "Invalid mobile number. Use a South Africa (+27) or Eswatini (+268) number.",
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

    // Dual-write (Phase 2 of the Mongo -> Postgres migration): mirror into
    // Postgres, non-fatal — Mongo remains the source of truth for reads.
    // Awaited (not fire-and-forget) since serverless functions don't
    // guarantee background work continues after the response is sent.
    await syncUser(newUser as any);

    try {
      const regToken =
        formData.registrationMediaToken ||
        formData.registrationToken ||
        undefined;
      if (regToken) {
        const { claimRegistrationMedia } = await import("@/lib/supabase/media");
        await claimRegistrationMedia(String(regToken), newUser._id.toString());
      }
    } catch (e) {
      console.warn("[register] media claim skipped:", e);
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
        subscriptionTier: "pro",
        profilePhoto: formData.profilePhoto,
        medicalDocuments: Array.isArray(formData.medicalDocuments)
          ? formData.medicalDocuments
          : [],
      });
      await syncPatientProfile(newUser._id.toString(), patientProfile as any);

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
      });
      await syncPractitionerProfile(newUser._id.toString(), practitionerProfile as any);

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
            await syncStaff(invite.facilityId.toString(), newStaff as any);

            invite.status = "accepted";
            invite.acceptedAt = new Date();
            await invite.save();
            await updateStaffInviteByMongoId(invite._id.toString(), {
              status: "accepted",
              accepted_at: invite.acceptedAt,
            });
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
      await syncFacility(newFacility as any);

      const adminProfile = await HospitalAdminProfile.create({
        userId: newUser._id,
        hospitalId: newFacility._id,
        department: "Administration",
        permissions: ["all"],
      });
      await syncHospitalAdminProfile(newUser._id.toString(), adminProfile as any);
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
    return NextResponse.json(
      {
        error: "Registration failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
