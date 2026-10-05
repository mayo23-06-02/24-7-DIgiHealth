import { FacilityPatient } from "@/lib/models/FacilityPatient";
import Staff from "@/lib/models/Staff";
import { isValidId, toId } from "@/lib/db";

/** Statuses under which a file number is usable for access and booking. */
export const ACTIVE_FILE = "active" as const;

function ids(rows: { facilityId?: unknown }[]): string[] {
  return [...new Set(rows.map((r) => toId(r.facilityId)).filter((x): x is string => !!x))];
}

/** Hospitals that currently hold an active file for this patient. */
export async function getPatientFacilityIds(patientId: string): Promise<string[]> {
  if (!isValidId(patientId)) return [];
  const rows = await FacilityPatient.find({ patientId, status: ACTIVE_FILE })
    .select("facilityId")
    .lean();
  return ids(rows);
}

/** Hospitals where this practitioner is an active member of staff. */
export async function getPractitionerFacilityIds(userId: string): Promise<string[]> {
  if (!isValidId(userId)) return [];
  const rows = await Staff.find({ userId, status: { $in: ["active", null] } })
    .select("facilityId")
    .lean();
  return ids(rows);
}

/** Does this hospital hold an active file for the patient? */
export async function hasActiveFile(patientId: string, facilityId: string): Promise<boolean> {
  if (!isValidId(patientId) || !isValidId(facilityId)) return false;
  return !!(await FacilityPatient.exists({ patientId, facilityId, status: ACTIVE_FILE }));
}

/** Ids of patients holding an active or pending file at this hospital. */
export async function getFacilityPatientIds(
  facilityId: string,
  statuses: string[] = ["active", "pending"],
): Promise<string[]> {
  if (!isValidId(facilityId)) return [];
  const rows = await FacilityPatient.find({ facilityId, status: { $in: statuses } })
    .select("patientId")
    .lean();
  return [...new Set(rows.map((r) => toId(r.patientId)).filter((x): x is string => !!x))];
}

/** Hospitals both the practitioner works at and the patient holds an active file with. */
export async function sharedFacilityIds(patientId: string, practitionerId: string): Promise<string[]> {
  const [mine, theirs] = await Promise.all([
    getPractitionerFacilityIds(practitionerId),
    getPatientFacilityIds(patientId),
  ]);
  const set = new Set(theirs);
  return mine.filter((f) => set.has(f));
}
