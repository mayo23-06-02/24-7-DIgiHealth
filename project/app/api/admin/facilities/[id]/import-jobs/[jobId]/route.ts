import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { getImportJobSummary } from "@/lib/provisioning/importJob";
import { ImportJobRow } from "@/lib/models/ProvisioningTokens";
import { isValidId, toId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  try {
    const { id, jobId } = await params;
    const g = await loadFacilityForAdmin(id);
    if (g.error) return g.error;
    if (!isValidId(jobId)) return NextResponse.json({ error: "Invalid job id" }, { status: 400 });

    const job = await getImportJobSummary(jobId);
    if (!job || toId(job.facilityId) !== g.facility.id) {
      return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    }
    const onlyProblems = new URL(req.url).searchParams.get("problems") === "1";
    const rows = await ImportJobRow.find(onlyProblems ? { jobId, status: "failed" } : { jobId })
      .sort({ rowNumber: 1 })
      .limit(500)
      .lean();
    return NextResponse.json({ success: true, data: { job, rows } });
  } catch (err) {
    return apiError(err);
  }
}
