import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";
import {
  buildHospitalReport,
  type ReportType,
} from "@/lib/hospital/buildHospitalReports";
import { buildHospitalReportPdf } from "@/lib/pdf/buildHospitalReportPdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";

export const runtime = "nodejs";

/**
 * GET /api/hospital/reports/export?type=overview&from=&to=&...
 * Returns branded PDF of the full facility report (respects filters).
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== "hospital_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json(
        { error: "No facility linked" },
        { status: 404 },
      );
    }

    const sp = req.nextUrl.searchParams;
    const type = (sp.get("type") || "overview") as ReportType;

    const report = await buildHospitalReport(
      hospitalId,
      user.firstName || "Administrator",
      {
        type,
        from: sp.get("from") || undefined,
        to: sp.get("to") || undefined,
        search: sp.get("search") || undefined,
        sort: sp.get("sort") || undefined,
        sortDir: (sp.get("sortDir") as "asc" | "desc") || "desc",
        department: sp.get("department") || undefined,
        role: sp.get("role") || undefined,
        status: sp.get("status") || undefined,
        risk: sp.get("risk") || undefined,
        onDuty: sp.get("onDuty") || undefined,
      },
    );

    const { buffer } = await buildHospitalReportPdf(report);
    const safe = (report.meta.facilityName || "Facility")
      .replace(/\s+/g, "_")
      .replace(/[^\w.-]/g, "");
    const filename = `Facility_Report_${safe}_${type}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return pdfResponse(buffer, filename);
  } catch (err: any) {
    console.error("[GET /api/hospital/reports/export]", err);
    return NextResponse.json(
      { error: err.message || "PDF export failed" },
      { status: 500 },
    );
  }
}
