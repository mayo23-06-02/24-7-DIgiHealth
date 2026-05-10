import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { PatientProfile, PractitionerProfile, HospitalAdminProfile } from "@/lib/models/RoleProfiles";
import Facility from "@/lib/models/Facility";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { role: wizardRole, formData } = await request.json();

    if (!wizardRole || !formData) {
      return NextResponse.json(
        { error: "Missing registration data" },
        { status: 400 }
      );
    }

    // 1. Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: formData.email?.toLowerCase() || formData.adminEmail?.toLowerCase() },
        { saId: formData.saId }
      ].filter(cond => cond.email || cond.saId)
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or SA ID already exists" },
        { status: 409 }
      );
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(formData.password, salt);

    // 3. Map wizard role to model role
    let modelRole: string = wizardRole;
    if (wizardRole === "hospital") modelRole = "hospital_admin";

    // 4. Create User
    const userData = {
      email: (formData.email || formData.adminEmail || "").toLowerCase(),
      passwordHash,
      role: modelRole,
      firstName: formData.firstName || formData.fullName?.split(" ")[0] || formData.adminName?.split(" ")[0] || "User",
      lastName: formData.lastName || formData.fullName?.split(" ").slice(1).join(" ") || formData.adminName?.split(" ").slice(1).join(" ") || "Registry",
      saId: formData.saId,
      mobile: formData.mobile,
      status: "active",
    };

    const newUser = await User.create(userData);

    // 5. Create Profile based on role
    if (wizardRole === "patient") {
      await PatientProfile.create({
        userId: newUser._id,
        dateOfBirth: formData.dob ? new Date(formData.dob) : new Date(),
        gender: formData.gender?.toLowerCase() || "other",
        emergencyContact: {
          name: formData.emergencyName || "N/A",
          phone: formData.emergencyPhone || "N/A",
          relationship: "N/A"
        },
        popiaConsentDate: new Date(),
        subscriptionTier: "pro", 
        profilePhoto: formData.profilePhoto,
        medicalDocuments: formData.medicalDocument ? [formData.medicalDocument] : [],
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
        type: formData.facilityType === "NGO / Clinic" ? "ngo" : (formData.facilityType?.toLowerCase() || "private"),
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

      // Link admin user to the new facility — CRITICAL for dashboard to work
      await HospitalAdminProfile.create({
        userId: newUser._id,
        hospitalId: newFacility._id,
        department: "Administration",
        permissions: ["all"],
      });

      // Also update the user record with the facilityId for quick lookups
      await User.findByIdAndUpdate(newUser._id, { facilityId: newFacility._id });
    }

    return NextResponse.json({
      success: true,
      message: "Registration successful",
      userId: newUser._id
    });

  } catch (error: any) {
    console.error("Registration Error:", error);
    return NextResponse.json(
      {
        error: "Registration failed",
        details: error.message
      },
      { status: 500 }
    );
  }
}
