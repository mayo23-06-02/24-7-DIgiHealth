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
import bcrypt from "bcryptjs";
import { normalizeEmail } from "@/lib/supabase/auth";
import { composeRegistrationPhone } from "@/lib/phone/normalizePhone";

/**
 * POST /api/auth/register
 * Creates DigiHealth account (password). Email is unverified until
 * the user clicks the Supabase magic/sign-in link from /verify-email.
 *
 * Body: { role, formData }
 * Does NOT issue a session JWT — user must verify email then login.
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
      await PatientProfile.create({
        userId: newUser._id,
        dateOfBirth: formData.dob ? new Date(formData.dob) : new Date(),
        gender: formData.gender?.toLowerCase() || "other",
        emergencyContact: {
          name: formData.emergencyName || "N/A",
          phone: formData.emergencyPhone || "N/A",
          relationship: "N/A",
        },
        popiaConsentDate: new Date(),
        subscriptionTier: "pro",
        profilePhoto: formData.profilePhoto,
        medicalDocuments: formData.medicalDocument
          ? [formData.medicalDocument]
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

      await MedicalContext.create({
        patientId: newUser._id,
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
    } else if (wizardRole === "practitioner") {
      await PractitionerProfile.create({
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
    } else if (wizardRole === "hospital") {
      const newFacility = await Facility.create({
        name: formData.facilityName,
        type:
          formData.facilityType === "NGO / Clinic"
            ? "ngo"
            : formData.facilityType?.toLowerCase() || "private",
        location: {
          address: formData.street,
          city: formData.city,
          province: formData.province,
          country: "South Africa",
        },
        contactNo: formData.mobile || "",
        email: formData.adminEmail,
        bedCapacity: {
          total: parseInt(formData.bedCapacity) || 0,
        },
        logo: formData.facilityLogo,
        wallpaper: formData.facilityWallpaper,
        regCertificate: formData.regCertificate,
        status: "active",
      });

      await HospitalAdminProfile.create({
        userId: newUser._id,
        hospitalId: newFacility._id,
        department: "Administration",
        permissions: ["all"],
      });

      await User.findByIdAndUpdate(newUser._id, {
        facilityId: newFacility._id,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Account created. Please verify your email to continue.",
      requiresEmailVerification: true,
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
