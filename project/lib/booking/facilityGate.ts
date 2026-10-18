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
      "A hospital file number is required to book. Ask the hospital that treats you to register you on 24/7 DigiMedCare.",
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

/** Consultation methods a patient can book. Chat bookings stay supported for older flows. */
export const BOOKABLE_METHODS = ["video", "voice", "in_person", "chat"] as const;
export type BookableMethod = (typeof BOOKABLE_METHODS)[number];

/**
 * Checks the method against the hospital's settings: in-person visits are only bookable at
 * a hospital that has switched them on. Returns the normalised method.
 */
export async function assertMethodAllowed(facilityId: string, rawType: unknown): Promise<BookableMethod> {
  const type = (rawType ?? "video") as BookableMethod;
  if (!BOOKABLE_METHODS.includes(type)) {
    throw new PublicError("Choose video, voice or in-person for this appointment.", 400);
  }
  if (type === "in_person") {
    const { default: Facility } = await import("@/lib/models/Facility");
    const f = await Facility.findById(facilityId).select("inPersonEnabled name").lean();
    if (!f?.inPersonEnabled) {
      throw new PublicError(`${f?.name ?? "This hospital"} does not offer in-person appointments. Choose video or voice.`, 400);
    }
  }
  return type;
}
