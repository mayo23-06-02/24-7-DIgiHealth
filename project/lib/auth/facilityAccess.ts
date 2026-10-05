import { Consultation } from "@/lib/models/Consultation";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { FacilityPatient } from "@/lib/models/FacilityPatient";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";
import { sharedFacilityIds } from "@/lib/facility/membership";
import { isValidId } from "@/lib/db";

/**
 * Which of a patient's hospital records a caller may see.
 *
 * - `all`: the patient themselves, or a platform admin acting on the platform.
 * - `facilities`: only records owned by these hospitals (plus records the patient
 *   entered themselves, which carry no hospital).
 */
export type PatientScope =
  | { kind: "all" }
  | { kind: "facilities"; facilityIds: string[] };

export interface PatientAccess {
  allowed: boolean;
  scope: PatientScope;
}

const DENIED: PatientAccess = { allowed: false, scope: { kind: "facilities", facilityIds: [] } };

interface Caller {
  userId: string;
  role: string;
  email?: string;
}

/**
 * The single answer to "may this caller see this patient, and which hospitals' records".
 *
 * Practitioner: must work at a hospital that holds an active file for the patient,
 * AND be linked to them (assigned, or have a consultation) — either alone is not enough.
 * Hospital admin: the patient must hold a file at the admin's own hospital.
 */
export async function getPatientAccess(caller: Caller, patientId: string): Promise<PatientAccess> {
  if (!caller?.userId || !isValidId(patientId)) return DENIED;

  if (caller.userId === patientId) return { allowed: true, scope: { kind: "all" } };
  if (caller.role === "mega_admin") return { allowed: true, scope: { kind: "all" } };

  if (caller.role === "practitioner") {
    const shared = await sharedFacilityIds(patientId, caller.userId);
    if (shared.length === 0) return DENIED;

    const profile = await PractitionerProfile.findOne({ userId: caller.userId })
      .select("assignedPatientIds")
      .lean<{ assignedPatientIds?: unknown[] } | null>();
    const assigned = (profile?.assignedPatientIds || []).map((id) => String(id));
    const linked =
      assigned.includes(patientId) ||
      !!(await Consultation.exists({ patientId, practitionerId: caller.userId }));
    if (!linked) return DENIED;

    return { allowed: true, scope: { kind: "facilities", facilityIds: shared } };
  }

  if (caller.role === "hospital_admin") {
    const facilityId = await resolveHospitalId(caller.userId, caller.email);
    if (!facilityId) return DENIED;
    const file = await FacilityPatient.exists({
      patientId,
      facilityId,
      status: { $in: ["active", "pending"] },
    });
    return file
      ? { allowed: true, scope: { kind: "facilities", facilityIds: [facilityId] } }
      : DENIED;
  }

  return DENIED;
}

/** Query fragment limiting clinical rows to what the scope may see. Spread into a filter. */
export function recordScopeFilter(scope: PatientScope): Record<string, unknown> {
  if (scope.kind === "all") return {};
  return {
    $or: [
      { facilityId: { $in: scope.facilityIds } },
      { facilityId: { $exists: false } }, // entered by the patient
    ],
  };
}

/** The same rule applied in memory to a row that has already been loaded. */
export function rowVisibleInScope(
  row: { facilityId?: unknown },
  scope: PatientScope,
): boolean {
  if (scope.kind === "all") return true;
  if (row.facilityId === undefined || row.facilityId === null) return true;
  return scope.facilityIds.includes(String(row.facilityId));
}
