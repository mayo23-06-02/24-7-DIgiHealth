import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import {
  buildAdminReport,
  type AdminReportType,
} from "@/lib/admin/buildAdminReports";
import { buildPlatformReportPdf } from "@/lib/pdf/buildPlatformReportPdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const type = (sp.get("type") || "overview") as AdminReportType;
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

    const { buffer } = await buildPlatformReportPdf(report);
    const filename = `Platform_Report_${type}_${new Date().toISOString().slice(0, 10)}.pdf`;
    return pdfResponse(buffer, filename);
  } catch (err: any) {
    console.error("[GET /api/admin/reports/export]", err);
    return apiError(err, "PDF failed");
  }
}
