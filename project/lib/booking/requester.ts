/**
 * Who must wait for the other party's decision on a booking.
 *
 * Accept is a two-party handshake: whoever didn't make the latest move
 * (the original request, or a later reschedule proposal) is the one who
 * gets to Accept/Decline. This keeps the UI symmetric for both patient- and
 * practitioner-initiated bookings instead of assuming one role always
 * accepts.
 */

interface RequesterLookup {
  source?: string | null;
  patientId: { toString(): string } | string;
  practitionerId: { toString(): string } | string;
}

/** The user who originally created this booking request. */
export function getRequesterId(c: RequesterLookup): string {
  if (c.source === "practitioner_schedule") return c.practitionerId.toString();
  // patient_self_serve, hospital_desk, system, or unset all default to the
  // patient as requester — matches the overwhelmingly common booking path.
  return c.patientId.toString();
}

/**
 * The user currently blocked from clicking Accept: whoever proposed the
 * latest pending reschedule, or the original requester if none is pending.
 */
export function getBlockedAcceptorId(
  c: RequesterLookup & {
    pendingReschedule?: { proposedBy: { toString(): string } | string } | null;
  },
): string {
  if (c.pendingReschedule) return c.pendingReschedule.proposedBy.toString();
  return getRequesterId(c);
}
