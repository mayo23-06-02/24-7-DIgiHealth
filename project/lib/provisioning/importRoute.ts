import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "./adminGuard";
import { parseImportFile } from "./parseFile";
import { createImportJob } from "./importJob";
import type { ImportKind } from "./columns";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { apiError } from "@/lib/api/errors";

const MAX_BYTES = 5 * 1024 * 1024;

/** Shared handler for POST /api/admin/facilities/[id]/{patients,doctors}/import. */
export async function handleImportUpload(
  req: NextRequest,
  idParam: string,
  kind: ImportKind,
): Promise<NextResponse> {
  try {
    const g = await loadFacilityForAdmin(idParam);
    if (g.error) return g.error;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ success: false, error: "Choose a .xlsx or .csv file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, error: "File is larger than 5 MB." }, { status: 413 });
    }

    let parsed;
    try {
      parsed = await parseImportFile(kind, file.name, Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
    }
    if (parsed.missingHeaders.length) {
      return NextResponse.json(
        { success: false, error: `Missing required column(s): ${parsed.missingHeaders.join(", ")}`, missingHeaders: parsed.missingHeaders },
        { status: 400 },
      );
    }
    if (parsed.rows.length === 0) {
      return NextResponse.json({ success: false, error: "The file has a header but no rows." }, { status: 400 });
    }

    const job = await createImportJob({
      facilityId: g.facility.id,
      kind,
      uploadedBy: g.user.userId,
      fileName: file.name,
      rows: parsed.rows,
    });
    await logAdminAction({
      actor: g.user,
      action: `facility.${kind}.import_uploaded`,
      targetType: "facility",
      targetId: g.facility.id,
      metadata: { jobId: job.jobId, rows: job.total, rejectedAtUpload: job.failed, fileName: file.name },
    });
    return NextResponse.json({ success: true, data: { ...job, unknownHeaders: parsed.unknownHeaders } }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
