import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { getImportJobSummary, processImportBatch } from "@/lib/provisioning/importJob";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { getAppOrigin } from "@/lib/supabase/auth";
import { isValidId, toId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Process the next batch of an uploaded job. The admin screen calls this until `remaining` is 0. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  try {
    const { id, jobId } = await params;
    const g = await loadFacilityForAdmin(id);
    if (g.error) return g.error;
    if (!isValidId(jobId)) return NextResponse.json({ error: "Invalid job id" }, { status: 400 });

    const job = await getImportJobSummary(jobId);
    if (!job || toId(job.facilityId) !== g.facility.id) {
      return NextResponse.json({ error: "Import job not found" }, { status: 404 });
    }

    const result = await processImportBatch(jobId, g.facility, g.user.userId, getAppOrigin(req.url));
    if (result.remaining === 0 && result.processed > 0) {
      await logAdminAction({
        actor: g.user,
        action: `facility.${job.kind}.import_completed`,
        targetType: "facility",
        targetId: g.facility.id,
        metadata: { jobId },
      });
    }
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    return apiError(err);
  }
}
