import { Consultation } from "@/lib/models/Consultation";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { isValidId } from '@/lib/db';
import { sharedFacilityIds } from "@/lib/facility/membership";

/**
 * True if the practitioner (or mega_admin) may view this patient's clinical data/docs.
 */
export async function canPractitionerAccessPatient(
  practitionerUserId: string,
  patientUserId: string,
  role?: string,
): Promise<boolean> {
  if (role === "mega_admin") return true;
  if (!practitionerUserId || !patientUserId) return false;
  if (practitionerUserId === patientUserId) return true;

  if (
    !isValidId(practitionerUserId) ||
    !isValidId(patientUserId)
  ) {
    return false;
  }

  // Hospital isolation: must work at a hospital holding the patient's active file.
  if ((await sharedFacilityIds(patientUserId, practitionerUserId)).length === 0) {
    return false;
  }

  const practitionerProfile = await PractitionerProfile.findOne({
    userId: practitionerUserId,
  }).lean();
  const assignedIds = (practitionerProfile?.assignedPatientIds || []).map(
    (id: { toString: () => string }) => id.toString(),
  );
  if (assignedIds.includes(patientUserId)) return true;

  const hasConsultation = await Consultation.exists({
    patientId: patientUserId,
    practitionerId: practitionerUserId,
  });
  return !!hasConsultation;
}
