import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { validDoctorRow } from "@/lib/provisioning/rows";
import { ProvisionError, provisionDoctor } from "@/lib/provisioning/service";
import Staff from "@/lib/models/Staff";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { getAppOrigin } from "@/lib/supabase/auth";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** List a hospital's staff (doctors and others) with their staff numbers. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await loadFacilityForAdmin((await params).id);
    if (g.error) return g.error;
    const staff = await Staff.find({ facilityId: g.facility.id })
      .populate("userId", "firstName lastName email emailVerified")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    return NextResponse.json({ success: true, data: staff });
  } catch (err) {
    return apiError(err);
  }
}

/** Add one doctor with the standard fields (same rules as a spreadsheet row). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await loadFacilityForAdmin((await params).id);
    if (g.error) return g.error;

    const raw = await req.json();
    const parsed = validDoctorRow(raw);
    if (!parsed.ok) return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });

    try {
      const result = await provisionDoctor(parsed.value, {
        facility: g.facility,
        actorId: g.user.userId,
        via: "hospital_form",
        origin: getAppOrigin(req.url),
      });
      await logAdminAction({
        actor: g.user,
        action: `facility.doctor.${result.status}`,
        targetType: "user",
        targetId: result.userId,
        metadata: { facilityId: g.facility.id, staffNumber: result.fileNumber },
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
