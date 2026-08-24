import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { PatientProfile, PractitionerProfile } from "@/lib/models/RoleProfiles";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { isMongoObjectId } from "@/lib/utils/mongoId";

import { apiError } from "@/lib/api/errors";
async function getUserId(req: NextRequest): Promise<string | null> {
  return req.headers.get("x-user-id") || null;
}

// GET /api/user/role-data – returns role-specific profile data
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Postgres-native accounts have no Mongo `User`/profile row to seed or
    // read (see lib/utils/mongoId.ts) — return sensible defaults instead of
    // crashing on findById/auto-seed create().
    if (!isMongoObjectId(userId)) {
      const requestUser = await getRequestUser();
      if (!requestUser)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const roleData =
        requestUser.role === "patient"
          ? {
              medicalAid: { provider: "", planName: "", memberNumber: "" },
              emergencyContact: { name: "", phone: "", relationship: "" },
              nextOfKin: [],
              subscriptionTier: "free",
              dateOfBirth: null,
              gender: null,
              popiaConsentDate: null,
            }
          : requestUser.role === "practitioner"
            ? {
                specialisation: "General Practitioner",
                hpcsaNumber: "",
                experienceYears: 0,
                bio: "",
                languages: ["English"],
                acceptedMedicalAids: [],
                bankAccount: {
                  accountHolder: "",
                  bankName: "",
                  accountNumber: "",
                  branchCode: "",
                  taxNumber: "",
                },
                hpcsaVerified: false,
                rating: 0,
                reviewCount: 0,
              }
            : { role: requestUser.role, status: "active" };
      return NextResponse.json({ success: true, data: roleData });
    }

    const user = await User.findById(userId).lean();
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    let roleData: Record<string, any> = {};

    if (user.role === "patient") {
      let profile = await PatientProfile.findOne({ userId }).lean();

      // Auto-seed if profile missing
      if (!profile) {
        const newProfile = await PatientProfile.create({
          userId,
          dateOfBirth: new Date("1990-01-01"),
          gender: "female",
          subscriptionTier: "free",
          emergencyContact: { name: "", phone: "", relationship: "" },
          medicalAid: { provider: "", planName: "", memberNumber: "" },
        });
        profile = newProfile.toObject();
      }

      roleData = {
        medicalAid: profile.medicalAid || {
          provider: "",
          planName: "",
          memberNumber: "",
        },
        emergencyContact: profile.emergencyContact || {
          name: "",
          phone: "",
          relationship: "",
        },
        nextOfKin: profile.nextOfKin || [],
        subscriptionTier: profile.subscriptionTier || "free",
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        popiaConsentDate: profile.popiaConsentDate,
      };
    } else if (user.role === "practitioner") {
      let profile = await PractitionerProfile.findOne({ userId }).lean();

      // Auto-seed if profile missing
      if (!profile) {
        const newProfile = await PractitionerProfile.create({
          userId,
          specialisation: "General Practitioner",
          hpcsaNumber: `HPCSA-${Math.floor(Math.random() * 900000) + 100000}`,
          experienceYears: 0,
          bio: "",
          languages: ["English"],
          acceptedMedicalAids: ["Discovery", "Momentum"],
          bankAccount: {
            accountHolder: `${user.firstName} ${user.lastName}`,
            bankName: "",
            accountNumber: "",
            branchCode: "",
            taxNumber: "",
          },
        });
        profile = newProfile.toObject();
      }

      roleData = {
        specialisation: profile.specialisation,
        hpcsaNumber: profile.hpcsaNumber,
        experienceYears: profile.experienceYears || 0,
        bio: profile.bio || "",
        languages: profile.languages || ["English"],
        acceptedMedicalAids: profile.acceptedMedicalAids || [],
        bankAccount: profile.bankAccount || {
          accountHolder: "",
          bankName: "",
          accountNumber: "",
          branchCode: "",
          taxNumber: "",
        },
        hpcsaVerified: !!profile.hpcsaNumber,
        rating: profile.rating || 0,
        reviewCount: profile.reviewCount || 0,
      };
    } else if (user.role === "hospital_admin") {
      const { HospitalAdminProfile } = await import("@/lib/models/RoleProfiles");
      const { Facility } = await import("@/lib/models/Facility");
      
      const profile = await HospitalAdminProfile.findOne({ userId }).lean();
      let facility = null;
      if (profile?.hospitalId) {
        facility = await Facility.findById(profile.hospitalId).lean();
      }

      roleData = {
        department: profile?.department || "",
        permissions: profile?.permissions || [],
        facility: facility || {
          name: "",
          facilityType: "Private",
          contactInfo: { phone: "", email: "" },
          address: { city: "", province: "" },
          bedCapacity: { total: 0, generalAvailable: 0, icuAvailable: 0 }
        }
      };
    } else {
      // inspector, super_admin, mega_admin – base info only
      roleData = { role: user.role, status: user.status };
    }

    return NextResponse.json({ success: true, data: roleData });
  } catch (err: any) {
    console.error("[GET /api/user/role-data]", err);
    return apiError(err);
  }
}

// PUT /api/user/role-data – updates role-specific data
export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const userId = await getUserId(req);
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isMongoObjectId(userId)) {
      return NextResponse.json(
        { error: "Profile editing is not yet available for this account." },
        { status: 400 },
      );
    }

    const user = await User.findById(userId).lean();
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();

    if (user.role === "patient") {
      const update: Record<string, any> = {};
      if (body.medicalAid) update.medicalAid = body.medicalAid;
      if (body.emergencyContact)
        update.emergencyContact = body.emergencyContact;
      if (body.nextOfKin) {
        if (!Array.isArray(body.nextOfKin) || body.nextOfKin.length > 3) {
          return NextResponse.json(
            { error: "A patient can list at most 3 next of kin." },
            { status: 400 },
          );
        }
        update.nextOfKin = body.nextOfKin;
      }

      await PatientProfile.findOneAndUpdate(
        { userId },
        { $set: update },
        { upsert: true, new: true },
      );
    } else if (user.role === "practitioner") {
      const update: Record<string, any> = {};
      if (body.bankAccount) update.bankAccount = body.bankAccount;
      if (body.languages) update.languages = body.languages;
      if (body.bio) update.bio = body.bio;

      await PractitionerProfile.findOneAndUpdate(
        { userId },
        { $set: update },
        { upsert: true, new: true },
      );
    } else if (user.role === "hospital_admin") {
      const { HospitalAdminProfile } = await import("@/lib/models/RoleProfiles");
      const { Facility } = await import("@/lib/models/Facility");

      const profile = await HospitalAdminProfile.findOne({ userId });
      if (profile?.hospitalId && body.facility) {
        await Facility.findByIdAndUpdate(profile.hospitalId, {
          $set: body.facility
        });
      }
      if (body.department) {
        await HospitalAdminProfile.findOneAndUpdate(
          { userId },
          { $set: { department: body.department } },
          { upsert: true }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/user/role-data]", err);
    return apiError(err);
  }
}
