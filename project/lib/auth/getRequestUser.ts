import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "secret123!");

export interface RequestUser {
  userId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/** Mongo ObjectIds are exactly 24 hex chars; Postgres uuids are 36 chars with dashes. */
function looksLikeMongoObjectId(id: string): boolean {
  return /^[a-f0-9]{24}$/i.test(id);
}

/**
 * Migration note (Phase 3 — auth reads cut over to Postgres): the JWT's
 * `userId` claim, and every foreign key on every table that hasn't migrated
 * yet (Consultation.patientId, HospitalTransaction.patientId, Facility
 * refs, ...), are all Mongo ObjectIds — so for accounts that originated in
 * Mongo, `RequestUser.userId` MUST keep being the Mongo id string even
 * though the row now comes from Postgres (looked up via `mongo_id`).
 * Accounts with no Mongo origin at all (e.g. rows from
 * scripts/seed-supabase.ts) have no `mongo_id` — for those, `userId` is the
 * Postgres uuid itself, looked up via `id`. Once every domain has migrated
 * and every FK repointed to the uuid, this can be simplified to always look
 * up and return the Postgres id.
 */
async function getUserFromPostgres(identityId: string): Promise<RequestUser | null> {
  const column = looksLikeMongoObjectId(identityId) ? "mongo_id" : "id";
  const { data, error } = await getSupabaseAdmin()
    .from("users")
    .select("id, mongo_id, role, email, first_name, last_name")
    .eq(column, identityId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.mongo_id || data.id,
    role: data.role,
    email: data.email,
    firstName: data.first_name,
    lastName: data.last_name,
  };
}

async function getUserFromMongo(identityId: string): Promise<RequestUser | null> {
  // A Postgres-native account (uuid identity) has no possible Mongo match —
  // don't even attempt it (Mongoose would throw a CastError on a non-ObjectId).
  if (!looksLikeMongoObjectId(identityId)) return null;

  await connectToDatabase();
  const user = await User.findById(identityId).lean();
  if (!user) return null;

  return {
    userId: (user as any)._id.toString(),
    role: (user as any).role,
    email: (user as any).email,
    firstName: (user as any).firstName,
    lastName: (user as any).lastName,
  };
}

export async function getRequestUser(): Promise<RequestUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const identityId = payload.userId as string;

    const fromPg = await getUserFromPostgres(identityId).catch((err) => {
      console.warn("[getRequestUser] Postgres lookup failed, falling back to Mongo:", err);
      return null;
    });
    if (fromPg) return fromPg;

    // Safety net: row not (yet) synced to Postgres — fall back to Mongo so
    // auth never breaks for a genuinely valid session.
    return await getUserFromMongo(identityId);
  } catch (error) {
    console.error("getRequestUser auth error:", error);
    return null;
  }
}
