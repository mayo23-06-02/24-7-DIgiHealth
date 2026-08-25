import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePatientAccess } from "@/lib/auth/access";
import { apiError } from "@/lib/api/errors";
import { buildHealthProfilePdf } from "@/lib/pdf/buildHealthProfilePdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";

export const runtime = "nodejs";

/**
 * Full patient health profile PDF for practitioners.
 * GET or POST (POST may include bodyMapImage later — currently ignored; full clinical data always).
 * No MFA required.
 *
 * This route always checked linkage properly. What it had was a private copy
 * of the rule — assigned-to-me OR we-have-a-consultation — which was the third
 * of four such copies in this directory, next to two routes that had no check
 * at all. Sharing the helper is what makes the missing ones visible.
 */
async function generate(patientId: string) {
  await connectToDatabase();
  const user = await requirePatientAccess(patientId);

  const { buffer, fullName } = await buildHealthProfilePdf(patientId, {
    doctorId: user.userId,
  });
  const filename = `${fullName.replace(/\s+/g, "_")}_Health_Profile.pdf`;
  return pdfResponse(buffer, filename);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;
    return generate(patientId);
  } catch (err: unknown) {
    return apiError(err, "The report could not be generated. Please try again.");
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: patientId } = await params;
    // Optional bodyMapImage from client is no longer required for a working PDF
    try {
      await _req.json();
    } catch {
      /* empty body ok */
    }
    return generate(patientId);
  } catch (err: unknown) {
    return apiError(err, "The report could not be generated. Please try again.");
  }
}
