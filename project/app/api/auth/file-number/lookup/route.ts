import { NextResponse } from "next/server";
import { lookupFile, maskEmailAddress, toWizardPrefill } from "@/lib/provisioning/fileLookup";

const NO_MATCH: Record<string, string> = {
  patient: "We couldn't match those details. Check your hospital, file number and ID number, or ask your hospital to register you.",
  doctor: "We couldn't match those details. Check your hospital, staff number and HPCSA number, or ask your hospital administrator.",
};

/**
 * POST /api/auth/file-number/lookup
 * Body: { kind?: "patient" | "doctor", facilityId, fileNumber, idNumber?, dateOfBirth?, hpcsaNumber? }
 *
 * Step one of registration. On a match it returns the hospital's record in the wizard's field
 * names (no contact details) plus the masked email the person must confirm, or tells them the
 * file already belongs to an account.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const kind = body.kind === "doctor" ? "doctor" : "patient";
    const r = await lookupFile({
      kind,
      facilityId: body.facilityId,
      fileNumber: body.fileNumber,
      proof: { idNumber: body.idNumber, dateOfBirth: body.dateOfBirth, hpcsaNumber: body.hpcsaNumber },
    });
    if (!r.ok) {
      if (r.reason === "rate_limited") {
        return NextResponse.json({ error: "Too many attempts for this number. Try again in 15 minutes." }, { status: 429 });
      }
      return NextResponse.json({ error: NO_MATCH[kind] }, { status: r.reason === "bad_input" ? 400 : 404 });
    }
    const { match } = r;
    const state = match.user.hasPassword ? "has_account" : "ready";
    return NextResponse.json({
      success: true,
      data: {
        state,
        kind,
        hospital: match.facility,
        fileNumber: match.file.fileNumber,
        maskedEmail: state === "ready" ? maskEmailAddress(match.user.email) : null,
        prefill: state === "ready" ? toWizardPrefill(match) : null,
      },
    });
  } catch (error) {
    console.error("[file-number/lookup]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
