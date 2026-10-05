import { PublicError } from "@/lib/api/errors";
import { sharedFacilityIds } from "@/lib/facility/membership";

/**
 * The file-number gate for booking.
 *
 * A booking is only allowed when the practitioner works at a hospital that holds an
 * active file for the patient. Returns the hospital the booking belongs to; the
 * caller stores it on the consultation (never trust a client-supplied facility).
 *
 * `requestedFacilityId` is only used to choose between several shared hospitals.
 */
export async function resolveBookingFacility(
  patientId: string,
  practitionerId: string,
  requestedFacilityId?: string | null,
): Promise<string> {
  const shared = await sharedFacilityIds(patientId, practitionerId);

  if (shared.length === 0) {
    throw new PublicError(
      "A hospital file number is required to book. Ask the hospital that treats you to register you on 24/7 DigiHealth.",
      403,
    );
  }
  if (requestedFacilityId) {
    if (!shared.includes(requestedFacilityId)) {
      throw new PublicError("You do not hold a file at that hospital with this doctor.", 403);
    }
    return requestedFacilityId;
  }
  if (shared.length > 1) {
    throw new PublicError("This doctor works at more than one of your hospitals. Choose which one.", 400);
  }
  return shared[0];
}
