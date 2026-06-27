import { HospitalAdminProfile } from "@/lib/models/RoleProfiles";
import User from "@/lib/models/User";
import Facility from "@/lib/models/Facility";

/**
 * Resolves the Facility (hospital) ID for a hospital_admin user.
 *
 * Falls back through three strategies so admins registered before the
 * HospitalAdminProfile fix still work — and auto-heals their data.
 *
 *  1. HospitalAdminProfile.hospitalId  (ideal path)
 *  2. User.facilityId                  (set during registration)
 *  3. Facility matched by admin email  (last resort for legacy accounts)
 */
export async function resolveHospitalId(
  userId: string,
  userEmail?: string,
): Promise<string | null> {
  // ── 1. HospitalAdminProfile ───────────────────────────────────────────────
  const profile = (await HospitalAdminProfile.findOne({
    userId,
  }).lean()) as any;
  if (profile?.hospitalId) return profile.hospitalId.toString();

  // ── 2. User.facilityId ───────────────────────────────────────────────────
  const userDoc = (await User.findById(userId).lean()) as any;
  if (userDoc?.facilityId) {
    // Backfill the missing profile so future requests hit path #1
    await HospitalAdminProfile.create({
      userId,
      hospitalId: userDoc.facilityId,
      department: "Administration",
      permissions: ["all"],
    }).catch(() => {}); // ignore duplicate-key on race
    return userDoc.facilityId.toString();
  }

  // ── 3. Facility by email ──────────────────────────────────────────────────
  if (userEmail) {
    const facility = (await Facility.findOne({
      $or: [{ "contactInfo.email": userEmail }, { email: userEmail }],
    }).lean()) as any;

    if (facility?._id) {
      const facilityId = facility._id.toString();
      // Backfill both so subsequent requests are fast
      await User.findByIdAndUpdate(userId, { facilityId: facility._id });
      await HospitalAdminProfile.create({
        userId,
        hospitalId: facility._id,
        department: "Administration",
        permissions: ["all"],
      }).catch(() => {});
      return facilityId;
    }
  }

  return null;
}
