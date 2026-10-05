import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { validPatientRow } from "@/lib/provisioning/rows";
import { ProvisionError, provisionPatient } from "@/lib/provisioning/service";
import { FacilityPatient } from "@/lib/models/FacilityPatient";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { getAppOrigin } from "@/lib/supabase/auth";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** List a hospital's patients (file number, status, name, email). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await loadFacilityForAdmin((await params).id);
    if (g.error) return g.error;

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const q = (url.searchParams.get("q") ?? "").trim();
    const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);

    const filter: Record<string, unknown> = { facilityId: g.facility.id };
    if (status) filter.status = status;
    if (q) filter.fileNumber = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };

    const files = await FacilityPatient.find(filter)
      .populate("patientId", "firstName lastName email emailVerified")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return NextResponse.json({ success: true, data: files });
  } catch (err) {
    return apiError(err);
  }
}

/** Add one patient with the standard fields (same rules as a spreadsheet row). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await loadFacilityForAdmin((await params).id);
    if (g.error) return g.error;

    const raw = await req.json();
    const parsed = validPatientRow(raw);
    if (!parsed.ok) return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });

    try {
      const result = await provisionPatient(parsed.value, {
        facility: g.facility,
        actorId: g.user.userId,
        via: "hospital_form",
        origin: getAppOrigin(req.url),
      });
      await logAdminAction({
        actor: g.user,
        action: `facility.patient.${result.status}`,
        targetType: "user",
        targetId: result.userId,
        metadata: { facilityId: g.facility.id, fileNumber: result.fileNumber },
      });
      return NextResponse.json({ success: true, data: result }, { status: result.status === "created" ? 201 : 200 });
    } catch (err) {
      if (err instanceof ProvisionError) {
        return NextResponse.json({ success: false, errors: [err.message] }, { status: 409 });
      }
      throw err;
    }
  } catch (err) {
    return apiError(err);
  }
}

