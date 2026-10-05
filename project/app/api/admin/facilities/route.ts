import { NextRequest, NextResponse } from "next/server";
import Facility from "@/lib/models/Facility";
import Staff from "@/lib/models/Staff";
import HospitalAppointment from "@/lib/models/HospitalAppointment";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { parseFacilityInput } from "@/lib/facility/input";
import { logAdminAction } from "@/lib/admin/logAdminAction";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;

    const search = req.nextUrl.searchParams.get("search") || "";
    const facilities = await Facility.find().lean();

    const enriched = await Promise.all(
      (facilities as any[]).map(async (f) => {
        const fid = f._id;
        const [staffCount, doctors, appts30] = await Promise.all([
          Staff.countDocuments({ facilityId: fid }),
          Staff.countDocuments({ facilityId: fid, role: "doctor" }),
          HospitalAppointment.countDocuments({
            facilityId: fid,
            scheduledStart: {
              $gte: new Date(Date.now() - 30 * 24 * 3600 * 1000),
            },
          }),
        ]);
        return {
          id: fid.toString(),
          name: f.name,
          type: f.facilityType || "—",
          city: f.address?.city || "",
          province: f.address?.province || "",
          isOpen: f.isOpen !== false,
          emergencyServices: !!f.emergencyServices,
          beds: f.bedCapacity?.total || 0,
          staffCount,
          doctors,
          appointments30d: appts30,
          specialties: f.specialties || [],
        };
      }),
    );

    let rows = enriched;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.city.toLowerCase().includes(q) ||
          f.type.toLowerCase().includes(q),
      );
    }

    return NextResponse.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("[GET /api/admin/facilities]", err);
    return apiError(err);
  }
}

/** Create a facility. */
export async function POST(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;

    const parsed = parseFacilityInput(await req.json(), "create");
    if (!parsed.ok) return NextResponse.json({ success: false, errors: parsed.errors }, { status: 400 });
    const v = parsed.value;

    const dup = await Facility.findOne({ name: { $regex: `^${v.name!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } })
      .select("_id")
      .lean();
    if (dup) {
      return NextResponse.json({ success: false, errors: ["A facility with this name already exists"] }, { status: 409 });
    }

    const total = v.bedCapacity?.total ?? 0;
    const facility = await Facility.create({
      ...v,
      isOpen: v.isOpen ?? true,
      emergencyServices: v.emergencyServices ?? false,
      specialties: v.specialties ?? [],
      bedCapacity: {
        total,
        generalAvailable: v.bedCapacity?.generalAvailable ?? total,
        icuAvailable: v.bedCapacity?.icuAvailable ?? 0,
      },
      currentWaitTimeMins: 0,
    });
    await logAdminAction({
      actor: gate.user,
      action: "facility.create",
      targetType: "facility",
      targetId: String(facility._id),
      metadata: { name: v.name },
    });
    return NextResponse.json({ success: true, data: { id: String(facility._id), name: v.name } }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/admin/facilities]", err);
    return apiError(err);
  }
}
