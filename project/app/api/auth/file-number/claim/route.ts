import { NextResponse } from "next/server";
import { lookupFile, maskEmailAddress } from "@/lib/provisioning/fileLookup";
import { resendOnboarding } from "@/lib/provisioning/setPassword";
import { checkSharedRateLimit } from "@/lib/security/rateLimit";
import { getAppOrigin } from "@/lib/supabase/auth";

const NO_MATCH = "We couldn't match those details. Check your hospital, file number and ID number, or ask your hospital to register you.";

/**
 * POST /api/auth/file-number/claim
 * Body: same as lookup. Re-checks the proof and emails the set-password link to the address the
 * hospital has on file. Clicking it proves the mailbox, so no one can take over a record by
 * knowing the file number and ID number alone.
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

    if (match.user.hasPassword && match.user.emailVerified) {
      return NextResponse.json({ success: true, data: { state: "has_account" } });
    }

    const allowed = await checkSharedRateLimit(`file-claim:${match.user.id}`, { windowMs: 3_600_000, maxRequests: 3 });
    if (!allowed) {
      return NextResponse.json({ error: "A link was already sent recently. Check your inbox, or try again in an hour." }, { status: 429 });
    }

    const error = await resendOnboarding({
      user: { id: match.user.id, email: match.user.email, firstName: match.user.firstName },
      facilityName: match.facility.name,
      kind: "patient",
      fileNumber: match.file.fileNumber,
      origin: getAppOrigin(request.url),
    });
    if (error) {
      return NextResponse.json({ error: "We couldn't send the email right now. Please try again shortly." }, { status: 502 });
    }
    return NextResponse.json({
      success: true,
      data: { state: "sent", email: maskEmailAddress(match.user.email), hospital: match.facility.name },
    });
  } catch (error) {
    console.error("[file-number/claim]", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
