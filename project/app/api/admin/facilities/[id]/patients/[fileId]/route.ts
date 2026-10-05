import { NextRequest, NextResponse } from "next/server";
import { loadFacilityForAdmin } from "@/lib/provisioning/adminGuard";
import { FacilityPatient } from "@/lib/models/FacilityPatient";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { isValidId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

const SETTABLE = ["active", "suspended", "discharged"];

/** Change a patient's file status at this hospital (suspend, discharge, reactivate). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  try {
    const { id, fileId } = await params;
    const g = await loadFacilityForAdmin(id);
    if (g.error) return g.error;
    if (!isValidId(fileId)) return NextResponse.json({ error: "Invalid file id" }, { status: 400 });

    const { status } = await req.json();
    if (!SETTABLE.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${SETTABLE.join(", ")}` }, { status: 400 });
    }
    const file = await FacilityPatient.findOne({ _id: fileId, facilityId: g.facility.id });
    if (!file) return NextResponse.json({ error: "File not found at this hospital" }, { status: 404 });
    if (file.status === "pending" && status === "active") {
      return NextResponse.json({ error: "The patient has not finished setting up their account yet." }, { status: 409 });
    }
    file.status = status;
    await file.save();
    await logAdminAction({
      actor: g.user,
      action: `facility.patient.${status}`,
      targetType: "user",
      targetId: String(file.patientId),
      metadata: { facilityId: g.facility.id, fileNumber: file.fileNumber },
    });
    return NextResponse.json({ success: true, data: file.toObject() });
  } catch (err) {
    return apiError(err);
  }
}
