import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Facility from "@/lib/models/Facility";
import Staff from "@/lib/models/Staff";
import HospitalAppointment from "@/lib/models/HospitalAppointment";
import { requirePlatformAdmin } from "@/lib/auth/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

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
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
