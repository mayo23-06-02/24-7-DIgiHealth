import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  buildPatientsListPdf,
  type PatientListPdfRow,
} from "@/lib/pdf/buildPatientsListPdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

/**
 * POST /api/practitioner/patients/export
 * Body: { patients: PatientListPdfRow[], filters?: {...}, format?: 'pdf' }
 * Generates a branded PDF roster of the provided (already filtered/sorted) list.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user || (user.role !== "practitioner" && user.role !== "mega_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const patients = (body.patients || []) as PatientListPdfRow[];
    const filters = body.filters || {};

    if (!Array.isArray(patients)) {
      return NextResponse.json(
        { error: "patients array is required" },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const doctor = await User.findById(user.userId)
      .select("firstName lastName")
      .lean();
    const practitionerName = doctor
      ? `Dr. ${(doctor as any).firstName || ""} ${(doctor as any).lastName || ""}`.trim()
      : undefined;

    const { buffer, count } = await buildPatientsListPdf({
      patients,
      practitionerName,
      filters,
    });

    const filename = `Patients_${count}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return pdfResponse(buffer, filename);
  } catch (err: any) {
    console.error("[POST /api/practitioner/patients/export]", err);
    return apiError(err, "Failed to export PDF");
  }
}
