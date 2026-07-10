import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { buildHealthProfilePdf } from "@/lib/pdf/buildHealthProfilePdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";

export const runtime = "nodejs";

/**
 * GET — patient downloads own full health profile PDF.
 * No MFA / verification step required.
 */
export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "patient" && user.role !== "mega_admin") {
      return NextResponse.json(
        { error: "Only patients can use this endpoint. Practitioners should use patient profile report." },
        { status: 403 },
      );
    }

    const patientId = user.userId;
    // Patient self-download — doctor name from latest consultation (if any)
    const { buffer, fullName } = await buildHealthProfilePdf(patientId, {});
    const filename = `${fullName.replace(/\s+/g, "_")}_Health_Profile.pdf`;
    return pdfResponse(buffer, filename);
  } catch (err: any) {
    console.error("[GET /api/patient/health-record/report]", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate health profile" },
      { status: err.status || 500 },
    );
  }
}
