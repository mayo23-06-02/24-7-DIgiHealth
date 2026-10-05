import { NextResponse } from "next/server";
import { lookupFile, maskEmailAddress } from "@/lib/provisioning/fileLookup";
import { maskE164 } from "@/lib/phone/normalizePhone";

const NO_MATCH = "We couldn't match those details. Check your hospital, file number and ID number, or ask your hospital to register you.";

/**
 * POST /api/auth/file-number/lookup
 * Body: { facilityId, fileNumber, idNumber? , dateOfBirth? }
 *
 * Step one of patient registration. Returns the hospital's record for the patient (masked
 * contact details) so the wizard can show "we found you", plus whether they still need to
 * set a password or already have an account.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const r = await lookupFile({
      facilityId: body.facilityId,
      fileNumber: body.fileNumber,
      proof: { idNumber: body.idNumber, dateOfBirth: body.dateOfBirth },
    });
    if (!r.ok) {
      if (r.reason === "rate_limited") {
        return NextResponse.json({ error: "Too many attempts for this file number. Try again in 15 minutes." }, { status: 429 });
      }
      return NextResponse.json({ error: NO_MATCH }, { status: r.reason === "bad_input" ? 400 : 404 });
    }
    const { match } = r;
    const state = match.user.hasPassword && match.user.emailVerified ? "has_account" : "ready";
    return NextResponse.json({
      success: true,
      data: {
        state,
        hospital: match.facility,
        fileNumber: match.file.fileNumber,
        prefill:
          state === "ready"
            ? {
                firstName: match.user.firstName,
                lastName: match.user.lastName,
                email: maskEmailAddress(match.user.email),
                mobile: match.user.phoneE164 ? maskE164(match.user.phoneE164) : null,
                gender: match.profile?.gender ?? null,
                dateOfBirth: match.profile?.dateOfBirth ?? null,
                medicalAid: match.profile?.medicalAid ?? null,
                emergencyContact: match.profile?.emergencyContact ?? null,
              }
            : null,
      },
    });
  } catch (error) {
    console.error("[file-number/lookup]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
