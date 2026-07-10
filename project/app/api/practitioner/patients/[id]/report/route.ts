import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { connectToDatabase } from "@/lib/mongodb";
import { PractitionerProfile } from "@/lib/models/RoleProfiles";
import { Consultation } from "@/lib/models/Consultation";
import { buildHealthProfilePdf } from "@/lib/pdf/buildHealthProfilePdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";

export const runtime = "nodejs";

async function assertAccess(
  practitionerId: string,
  patientId: string,
  role: string,
) {
  if (role === "mega_admin") return true;
  const profile = await PractitionerProfile.findOne({
    userId: practitionerId,
  }).lean();
  const assigned = (profile?.assignedPatientIds || []).map((id: any) =>
    id.toString(),
  );
  if (assigned.includes(patientId)) return true;
  const hasConsult = await Consultation.exists({
    patientId,
    practitionerId,
  });
  return !!hasConsult;
}

/**
 * Full patient health profile PDF for practitioners.
 * GET or POST (POST may include bodyMapImage later — currently ignored; full clinical data always).
 * No MFA required.
 */
async function generate(patientId: string, userId: string, role: string) {
  await connectToDatabase();
  if (!mongoose.Types.ObjectId.isValid(patientId)) {
    return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
  }
  const ok = await assertAccess(userId, patientId, role);
  if (!ok) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { buffer, fullName } = await buildHealthProfilePdf(patientId, {
    doctorId: userId,
  });
  const filename = `${fullName.replace(/\s+/g, "_")}_Health_Profile.pdf`;
  return pdfResponse(buffer, filename);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getRequestUser();
    if (!user || (user.role !== "practitioner" && user.role !== "mega_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: patientId } = await params;
    return generate(patientId, user.userId, user.role);
  } catch (err: any) {
    console.error("[GET patient report]", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate report" },
      { status: err.status || 500 },
    );
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getRequestUser();
    if (!user || (user.role !== "practitioner" && user.role !== "mega_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: patientId } = await params;
    // Optional bodyMapImage from client is no longer required for a working PDF
    try {
      await _req.json();
    } catch {
      /* empty body ok */
    }
    return generate(patientId, user.userId, user.role);
  } catch (err: any) {
    console.error("[POST patient report]", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate report" },
      { status: err.status || 500 },
    );
  }
}
