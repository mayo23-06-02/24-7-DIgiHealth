import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolvePgFacilityId } from "./resolveId";

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
    .update(updates)
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
