import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { buildTemplateCsv, buildTemplateXlsx } from "@/lib/provisioning/parseFile";
import type { ImportKind } from "@/lib/provisioning/columns";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** GET ?kind=patients|doctors&format=xlsx|csv — the standard sheet hospitals fill in. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await loadFacilityForAdmin((await params).id);
    if (g.error) return g.error;
    const q = new URL(req.url).searchParams;
    const kind = (q.get("kind") === "doctors" ? "doctors" : "patients") as ImportKind;
    const format = q.get("format") === "csv" ? "csv" : "xlsx";
    const name = `digihealth-${kind}-template.${format}`;
    if (format === "csv") {
      return new NextResponse(buildTemplateCsv(kind), {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` },
      });
    }
    const buf = await buildTemplateXlsx(kind);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${name}"`,
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
