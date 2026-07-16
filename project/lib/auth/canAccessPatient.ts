import mongoose from "mongoose";
import { Consultation } from "@/lib/models/Consultation";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";

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
    !mongoose.Types.ObjectId.isValid(practitionerUserId) ||
    !mongoose.Types.ObjectId.isValid(patientUserId)
  ) {
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
