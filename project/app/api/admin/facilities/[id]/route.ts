import { NextRequest, NextResponse } from "next/server";
import Facility from "@/lib/models/Facility";
import { requirePlatformAdmin, isMegaAdmin } from "@/lib/auth/admin";
import { buildHospitalOverview } from "@/lib/hospital/buildHospitalOverview";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { parseFacilityInput } from "@/lib/facility/input";
import { FacilityPatient } from "@/lib/models/FacilityPatient";
import Staff from "@/lib/models/Staff";
import HospitalAppointment from "@/lib/models/HospitalAppointment";
import { Consultation } from "@/lib/models/Consultation";
import { isValidId } from "@/lib/db";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const { id } = await params;
    const facility = await Facility.findById(id).lean();
    if (!facility) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const overview = await buildHospitalOverview(id, gate.user.firstName || "Admin");
    return NextResponse.json({
      success: true,
      data: { facility, overview },
    });
  } catch (err: any) {
    return apiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ error: "Invalid facility id" }, { status: 400 });
    const body = await req.json();
    const facility = await Facility.findById(id);
    if (!facility) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const parsed = parseFacilityInput(body, "update");
    if (!parsed.ok) return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
    const v = parsed.value;

    // Renaming is mega-admin only; everything else is open to platform admins.
    if (v.name !== undefined && v.name !== facility.name) {
      if (!isMegaAdmin(gate.user.role)) {
        return NextResponse.json({ error: "Only a mega admin can rename a facility" }, { status: 403 });
      }
      facility.name = v.name;
    }
    if (v.facilityType) facility.facilityType = v.facilityType;
    if (typeof v.isOpen === "boolean") facility.isOpen = v.isOpen;
    if (typeof v.emergencyServices === "boolean") facility.emergencyServices = v.emergencyServices;
    if (v.specialties) facility.specialties = v.specialties;
    if (v.fileNumberPrefix !== undefined) facility.fileNumberPrefix = v.fileNumberPrefix;
    if (v.address) facility.address = { ...(facility.address as any), ...stripUndefined(v.address) } as any;
    if (v.contactInfo) facility.contactInfo = { ...(facility.contactInfo as any), ...stripUndefined(v.contactInfo) } as any;
    if (v.bedCapacity) facility.bedCapacity = { ...(facility.bedCapacity as any), ...stripUndefined(v.bedCapacity) } as any;
    await facility.save();

    await logAdminAction({
      actor: gate.user,
      action: "facility.update",
      targetType: "facility",
      targetId: id,
      metadata: body,
    });

    return NextResponse.json({ success: true, data: { id, isOpen: facility.isOpen } });
  } catch (err: any) {
    return apiError(err);
  }
}

function stripUndefined<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined)) as Partial<T>;
}

/**
 * Delete a facility. Mega admin only, and only when nothing depends on it: a hospital that
 * has patients, staff or appointments must be closed instead so records are not lost.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    if (!isMegaAdmin(gate.user.role)) {
      return NextResponse.json({ error: "Only a mega admin can delete a facility" }, { status: 403 });
    }
    const { id } = await params;
    if (!isValidId(id)) return NextResponse.json({ error: "Invalid facility id" }, { status: 400 });
    const facility = await Facility.findById(id).select("name").lean();
    if (!facility) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [patients, staff, appts, consults] = await Promise.all([
      FacilityPatient.countDocuments({ facilityId: id }),
      Staff.countDocuments({ facilityId: id }),
      HospitalAppointment.countDocuments({ facilityId: id }),
      Consultation.countDocuments({ facilityId: id }),
    ]);
    if (patients + staff + appts + consults > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `This facility still has ${patients} patient file(s), ${staff} staff, ${appts} appointment(s) and ${consults} consultation(s). Close it instead of deleting.`,
        },
        { status: 409 },
      );
    }

    await Facility.deleteOne({ _id: id });
    await logAdminAction({
      actor: gate.user,
      action: "facility.delete",
      targetType: "facility",
      targetId: id,
      metadata: { name: (facility as any).name },
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return apiError(err);
  }
}
