import { getRequestUser, type RequestUser } from "@/lib/auth/getRequestUser";
import { PublicError } from "@/lib/api/errors";
import { Conversation } from "@/lib/models/Conversation";
import Consultation from "@/lib/models/Consultation";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { isValidId } from '@/lib/db';
import { getPatientAccess } from '@/lib/auth/facilityAccess';

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
 * A note on identities. `RequestUser.userId` is the Postgres `users.id` (uuid).
 * A non-uuid id in a filter is compiled to a match-nothing read by lib/db, so
 * "no match" is the answer rather than an error.
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

  if (!isValidId(conversationId)) notFound("Conversation");

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) notFound("Conversation");

  if (!isParty(conversation, user.userId)) notFound("Conversation");

  return { user, conversation };
}

/** Same guarantee for a scheduled consultation. */
export async function requireConsultationParticipant(consultationId: string) {
  const user = await requireUser();

  if (!isValidId(consultationId)) notFound("Consultation");

  const consultation = await Consultation.findById(consultationId);
  if (!consultation) notFound("Consultation");

  if (!isParty(consultation, user.userId)) notFound("Consultation");

  return { user, consultation };
}

/**
 * The caller and which of the patient's hospital records they may see.
 *
 * Practitioners need BOTH a hospital in common with the patient (the patient holds an
 * active file at a hospital the practitioner works at) AND a link to them (assigned, or
 * a consultation). Answers with a 403 and says why — the caller already has the patient
 * id in front of them, so there is nothing to enumerate.
 */
export async function requirePatientAccessScoped(patientId: string) {
  const user = await requireRole("practitioner", "mega_admin", "hospital_admin");

  if (!isValidId(patientId)) {
    throw new PublicError("Invalid patient ID", 400);
  }

  const access = await getPatientAccess(user, patientId);
  if (!access.allowed) {
    throw new PublicError("Access denied: Patient not registered at your hospital", 403);
  }
  return { user, scope: access.scope };
}

/** Same check when the route only needs the caller. */
export async function requirePatientAccess(patientId: string): Promise<RequestUser> {
  return (await requirePatientAccessScoped(patientId)).user;
}
