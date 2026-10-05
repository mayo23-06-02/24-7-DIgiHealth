import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { getImportJobSummary } from "@/lib/provisioning/importJob";
import { ImportJobRow } from "@/lib/models/ProvisioningTokens";
import { isValidId, toId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** CSV of every row's outcome, so a hospital can fix the rejected ones and re-send. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  try {
    const { id, jobId } = await params;
    const g = await loadFacilityForAdmin(id);
    if (g.error) return g.error;
    if (!isValidId(jobId)) return NextResponse.json({ error: "Invalid job id" }, { status: 400 });
    const job = await getImportJobSummary(jobId);
    if (!job || toId(job.facilityId) !== g.facility.id) {
      return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    }
    const rows = await ImportJobRow.find({ jobId }).sort({ rowNumber: 1 }).lean();
    const csv = Papa.unparse(
      rows.map((r) => ({
        row: r.rowNumber,
        number: r.fileNumber ?? "",
        first_name: String((r.raw as Record<string, unknown>)?.first_name ?? ""),
        last_name: String((r.raw as Record<string, unknown>)?.last_name ?? ""),
        result: r.status,
        message: r.error ?? "",
      })),
    );
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="import-${jobId}.csv"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
