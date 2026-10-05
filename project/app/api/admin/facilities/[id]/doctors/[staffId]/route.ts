import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import Staff from "@/lib/models/Staff";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { isValidId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

const SETTABLE = ["active", "suspended", "left"];

/** Change a staff member's status at this hospital. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; staffId: string }> }) {
  try {
    const { id, staffId } = await params;
    const g = await loadFacilityForAdmin(id);
    if (g.error) return g.error;
    if (!isValidId(staffId)) return NextResponse.json({ error: "Invalid staff id" }, { status: 400 });

    const { status } = await req.json();
    if (!SETTABLE.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${SETTABLE.join(", ")}` }, { status: 400 });
    }
    const staff = await Staff.findOne({ _id: staffId, facilityId: g.facility.id });
    if (!staff) return NextResponse.json({ error: "Staff member not found at this hospital" }, { status: 404 });
    if (staff.status === "pending" && status === "active") {
      return NextResponse.json({ error: "This person has not finished setting up their account yet." }, { status: 409 });
    }
    staff.status = status;
    await staff.save();
    await logAdminAction({
      actor: g.user,
      action: `facility.doctor.${status}`,
      targetType: "user",
      targetId: staff.userId ? String(staff.userId) : undefined,
      metadata: { facilityId: g.facility.id, staffNumber: staff.fileNumber },
    });
    return NextResponse.json({ success: true, data: staff.toObject() });
  } catch (err) {
    return apiError(err);
  }
}
