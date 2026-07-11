import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import {
  buildAdminReport,
  adminReportToCsv,
  type AdminReportType,
} from "@/lib/admin/buildAdminReports";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const type = (sp.get("type") || "overview") as AdminReportType;
    const format = sp.get("format") || "json";

    const report = await buildAdminReport({
      type,
      from: sp.get("from") || undefined,
      to: sp.get("to") || undefined,
      search: sp.get("search") || undefined,
      sort: sp.get("sort") || undefined,
      sortDir: (sp.get("sortDir") as "asc" | "desc") || "desc",
      role: sp.get("role") || undefined,
      status: sp.get("status") || undefined,
    });

    if (format === "csv") {
      const csv = adminReportToCsv(type, report.tables);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="Platform_${type}_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (err: any) {
    console.error("[GET /api/admin/reports]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
