import { getRequestUser, type RequestUser } from "@/lib/auth/getRequestUser";
import { PublicError } from "@/lib/api/errors";
import { connectToDatabase } from "@/lib/mongodb";
import { Conversation } from "@/lib/models/Conversation";
import Consultation from "@/lib/models/Consultation";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { isMongoObjectId } from "@/lib/utils/mongoId";

/**
 * One place that answers "may this caller touch this record?".
 *
 * The codebase resolves identity five different ways and re-implements the
 * object-level checks per file, which is why they are present in some routes
 * and missing in others — a reviewer reading one handler has no way to tell
 * whether the check belongs there. These helpers exist so the answer is
 * written once and the absence of a call is visible.
 *
 * They throw `PublicError` rather than returning a response, so a route's
 * existing `catch` → `apiError` turns them into the right status with copy
 * written for a person. Every helper fails closed: anything it cannot prove is
 * a denial, never a pass.
 *
 * A note on identities. `RequestUser.userId` is a Mongo ObjectId for accounts
 * that originated in Mongo and a Postgres uuid for accounts that did not (see
 * lib/auth/getRequestUser.ts). Everything these helpers compare against —
 * Conversation.patientId, Consultation.practitionerId — is an ObjectId-typed
 * Mongo path, so a uuid identity can never match one. That is not a gap: a
 * Postgres-native account has no Mongo records to own, so "no match" is the
 * honest answer, and the global objectIdGuard already turns such a filter into
 * a match-nothing read rather than a CastError.
 */

/** Deliberately identical for "no such record" and "not yours". */
function notFound(what: string): never {
  throw new PublicError(`${what} not found`, 404);
}

/**
 * The caller, or a 401.
 *
 * The edge proxy already rejects an unauthenticated request to any non-public
 * `/api/` route, so reaching this with no session means either the route is on
 * the public allowlist or the proxy was bypassed. Both are worth failing on.
 */
export async function requireUser(): Promise<RequestUser> {
  const user = await getRequestUser();
  if (!user) throw new PublicError("Unauthorized", 401);
  return user;
}

/** The caller, if they hold one of these roles. */
export async function requireRole(...roles: string[]): Promise<RequestUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new PublicError("Forbidden", 403);
  }
  return user;
}

type ConversationParties = {
  patientId?: unknown;
  practitionerId?: unknown;
};

/** Whether an identity is one of the two people on a thread or appointment. */
function isParty(parties: ConversationParties, userId: string): boolean {
  return (
    String(parties.patientId ?? "") === userId ||
    String(parties.practitionerId ?? "") === userId
  );
}

/**
 * The caller and the conversation, if they are in it.
 *
 * A conversation that does not exist and one that belongs to somebody else
 * give the same 404 on purpose. Distinguishing them would turn any route using
 * this into a way to test whether an id is real, which is most of the value an
 * attacker gets from an id-keyed endpoint.
 */
export async function requireConversationParticipant(conversationId: string) {
  const user = await requireUser();

  if (!isMongoObjectId(conversationId)) notFound("Conversation");

  await connectToDatabase();
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) notFound("Conversation");

  if (!isParty(conversation, user.userId)) notFound("Conversation");

  return { user, conversation };
}

/** Same guarantee for a scheduled consultation. */
export async function requireConsultationParticipant(consultationId: string) {
  const user = await requireUser();

  if (!isMongoObjectId(consultationId)) notFound("Consultation");

  await connectToDatabase();
  const consultation = await Consultation.findById(consultationId);
  if (!consultation) notFound("Consultation");

  if (!isParty(consultation, user.userId)) notFound("Consultation");

  return { user, consultation };
}

/**
 * The caller, if they are a practitioner this patient is actually under.
 *
 * The rule is lifted verbatim from the one route that already had it
 * (`practitioner/patients/[id]/health-record`) rather than invented here:
 * the patient is on the practitioner's assigned list, or the two have a
 * consultation between them. Widening or narrowing that is a product decision,
 * not a refactor, so this keeps the existing behaviour exactly.
 *
 * Unlike the two helpers above this answers with a 403 and says why. There is
 * no enumeration to protect against — a practitioner reaching this already has
 * the patient id in front of them — and "not linked to your practice" is the
 * difference between a bug and a boundary for whoever hits it.
 */
export async function requirePatientAccess(patientId: string): Promise<RequestUser> {
  const user = await requireRole("practitioner", "mega_admin");

  if (!isMongoObjectId(patientId)) {
    throw new PublicError("Invalid patient ID", 400);
  }

  // A platform admin is not practising, so no link exists or is expected.
  if (user.role === "mega_admin") return user;

  await connectToDatabase();

  const practitionerId = user.userId;
  const profile = await PractitionerProfile.findOne({ userId: practitionerId })
    .select("assignedPatientIds")
    .lean<{ assignedPatientIds?: unknown[] } | null>();

  const assigned = (profile?.assignedPatientIds || []).map((id) => String(id));
  if (assigned.includes(patientId)) return user;

  const hasConsultation = await Consultation.exists({ patientId, practitionerId });
  if (hasConsultation) return user;

  throw new PublicError(
    "Access denied: Patient not linked to your practice",
    403,
  );
}
