/**
 * Mongo ObjectIds are exactly 24 hex chars; Postgres uuids are 36 chars with
 * dashes (see lib/auth/getRequestUser.ts's identity-resolution note — a
 * session's userId is a Postgres uuid for accounts with no Mongo origin at
 * all, e.g. rows from scripts/seed-supabase.ts).
 *
 * Passing a uuid into a Mongoose query filtering an ObjectId-typed field
 * (Consultation.patientId, Notification.userId, Conversation.patientId, ...)
 * throws a CastError before the filter even runs — Mongoose validates the
 * filter's shape against the schema, not just at insert time. Callers should
 * check this first and skip the query (returning an empty result) rather
 * than run it, since a genuinely Postgres-native account can have no rows in
 * a Mongo-only collection to find anyway — nothing in Mongo could reference
 * an id that was never a Mongo _id.
 */
export function isMongoObjectId(id: string | null | undefined): boolean {
  return !!id && /^[a-f0-9]{24}$/i.test(id);
}
