import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveHospitalId as resolveMongoHospitalId } from "@/lib/hospital/resolveHospitalId";

/** Mongo ObjectIds are exactly 24 hex chars; Postgres uuids are 36 chars with dashes. */
export function looksLikeMongoObjectId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

/**
 * Resolves any user identity (a Mongo ObjectId string from not-yet-migrated
 * callers/legacy sessions, or a Postgres uuid) to the Postgres `users.id`.
 * Returns null if the identity doesn't resolve to any Postgres user row.
 */
export async function resolvePgUserId(identity: string): Promise<string | null> {
  if (!identity) return null;
  const supabase = getSupabaseAdmin();
  if (looksLikeMongoObjectId(identity)) {
    const { data } = await supabase.from("users").select("id").eq("mongo_id", identity).maybeSingle();
    return data?.id || null;
  }
  // Already uuid-shaped — confirm it actually exists rather than trusting blindly.
  const { data } = await supabase.from("users").select("id").eq("id", identity).maybeSingle();
  return data?.id || null;
}

/** Same idea for a facility identity (Mongo ObjectId or Postgres uuid). */
export async function resolvePgFacilityId(identity: string): Promise<string | null> {
  if (!identity) return null;
  const supabase = getSupabaseAdmin();
  if (looksLikeMongoObjectId(identity)) {
    const { data } = await supabase.from("facilities").select("id").eq("mongo_id", identity).maybeSingle();
    return data?.id || null;
  }
  const { data } = await supabase.from("facilities").select("id").eq("id", identity).maybeSingle();
  return data?.id || null;
}

/**
 * Resolves the Postgres `facilities.id` for a hospital_admin, regardless of
 * whether their session identity is Postgres-native (uuid) or Mongo-origin
 * (ObjectId, resolved via the legacy lib/hospital/resolveHospitalId chain
 * and then translated to its Postgres counterpart). Use this — not the
 * Mongo-only resolveHospitalId — in any route that queries Postgres tables
 * directly.
 */
export async function resolvePostgresHospitalId(
  userId: string,
  userEmail?: string,
): Promise<string | null> {
  if (!looksLikeMongoObjectId(userId)) {
    const { data } = await getSupabaseAdmin()
      .from("hospital_admin_profiles")
      .select("facility_id")
      .eq("user_id", userId)
      .maybeSingle();
    return data?.facility_id || null;
  }

  const mongoFacilityId = await resolveMongoHospitalId(userId, userEmail);
  if (!mongoFacilityId) return null;
  return resolvePgFacilityId(mongoFacilityId);
}
