import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";
import {
  buildHospitalReport,
  reportToCsv,
  type ReportType,
} from "@/lib/hospital/buildHospitalReports";

export const runtime = "nodejs";

/**
 * GET /api/hospital/reports
 * Query: type, from, to, search, sort, sortDir, department, role, status, risk, onDuty, format=json|csv
 */
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== "hospital_admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    if (!hospitalId) {
      return NextResponse.json(
        {
          success: false,
          error: "No facility linked. Complete facility profile first.",
        },
        { status: 404 },
      );
    }

    const sp = req.nextUrl.searchParams;
    const type = (sp.get("type") || "overview") as ReportType;
    const format = sp.get("format") || "json";

    const filters = {
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
    };

    const report = await buildHospitalReport(
      hospitalId,
      user.firstName || "Administrator",
      filters,
    );

    if (format === "csv") {
      const csv = reportToCsv(type, report.tables);
      const filename = `Hospital_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (err: any) {
    console.error("[GET /api/hospital/reports]", err);
    return NextResponse.json(
      { success: false, error: err.message || "Report failed" },
      { status: 500 },
    );
  }
}
