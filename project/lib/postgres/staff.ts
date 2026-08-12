import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolvePgFacilityId } from "./resolveId";

/**
 * Callers speak the camelCase shape the Mongo model used; the Postgres `staff`
 * table is snake_case. Passing a camelCase key straight through fails at the
 * driver with "Could not find the 'isOnDuty' column of 'staff' in the schema
 * cache" — which surfaced as a 500 on the Toggle Duty button. Keys that are
 * identical in both (department, role, notes) need no entry here.
 */
const STAFF_COLUMN_MAP: Record<string, string> = {
  isOnDuty: "is_on_duty",
  onDuty: "is_on_duty",
  fullName: "full_name",
  userId: "user_id",
  facilityId: "facility_id",
  hourlyRate: "hourly_rate",
  shiftSchedule: "shift_schedule",
  employeeNumber: "employee_number",
  startDate: "start_date",
  endDate: "end_date",
};

function toStaffColumns(updates: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    mapped[STAFF_COLUMN_MAP[key] ?? key] = value;
  }
  return mapped;
}

export async function updateStaffByIdAndFacility(
  id: string,
  facilityId: string,
  updates: Record<string, any>
) {
  const supabase = getSupabaseAdmin();
  const resolveFacilityId = await resolvePgFacilityId(facilityId);
  if (!resolveFacilityId) {
    throw new Error("Facility not found");
  }

  const { data, error } = await supabase
    .from("staff")
    .update(toStaffColumns(updates))
    .eq("id", id)
    .eq("facility_id", resolveFacilityId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteStaffByIdAndFacility(id: string, facilityId: string) {
  const supabase = getSupabaseAdmin();
  const resolveFacilityId = await resolvePgFacilityId(facilityId);
  if (!resolveFacilityId) {
    throw new Error("Facility not found");
  }

  const { error } = await supabase
    .from("staff")
    .delete()
    .eq("id", id)
    .eq("facility_id", resolveFacilityId);

  if (error) throw error;
}

export async function getStaffByIdAndFacility(id: string, facilityId: string) {
  const supabase = getSupabaseAdmin();
  const resolveFacilityId = await resolvePgFacilityId(facilityId);
  if (!resolveFacilityId) {
    throw new Error("Facility not found");
  }

  const { data, error } = await supabase
    .from("staff")
    .select(`
      *,
      users:user_id(id, firstName:first_name, lastName:last_name, email)
    `)
    .eq("id", id)
    .eq("facility_id", resolveFacilityId)
    .single();

  if (error) throw error;
  return data;
}
