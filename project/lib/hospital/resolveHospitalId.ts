import { HospitalAdminProfile } from "@/lib/models/RoleProfiles";
import Facility from "@/lib/models/Facility";
import { isValidId } from "@/lib/db";

/**
 * Resolves the Facility (hospital) id for a hospital_admin user.
 *
 *  1. HospitalAdminProfile.hospitalId  (normal path)
 *  2. Facility matched by the admin's email — legacy accounts whose profile
 *     was never created. The profile is backfilled so the next call hits (1).
 */
export async function resolveHospitalId(
  userId: string,
  userEmail?: string,
): Promise<string | null> {
  if (!isValidId(userId)) return null;

  const profile = await HospitalAdminProfile.findOne({ userId }).lean();
  if (profile?.hospitalId) return String(profile.hospitalId);

  if (userEmail) {
    const facility = await Facility.findOne({
      "contactInfo.email": userEmail.toLowerCase(),
    }).lean();

    if (facility?._id) {
      await HospitalAdminProfile.create({
        userId,
        hospitalId: facility._id,
        department: "Administration",
        permissions: ["all"],
      }).catch(() => {}); // ignore duplicate-key on race
      return String(facility._id);
    }
  }

  return null;
}
