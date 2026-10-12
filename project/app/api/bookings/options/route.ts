import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { sharedFacilityIds } from "@/lib/facility/membership";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";
import Facility from "@/lib/models/Facility";
import { isValidId } from "@/lib/db";
import { apiError } from "@/lib/api/errors";

/**
 * GET /api/bookings/options?practitionerId=…  (patient)
 * GET /api/bookings/options?patientId=…       (practitioner)
 * GET /api/bookings/options?patientId=…&practitionerId=… (hospital admin)
 *
 * The hospitals where this patient and doctor can meet, with each one's address and
 * whether it takes in-person visits. The booking modal uses it to offer In person and,
 * when there is more than one hospital, to let the patient choose.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const q = req.nextUrl.searchParams;
    let patientId = q.get("patientId") ?? "";
    let practitionerId = q.get("practitionerId") ?? "";
    if (user.role === "patient") patientId = user.userId;
    else if (user.role === "practitioner") practitionerId = user.userId;
    else if (user.role !== "hospital_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!isValidId(patientId) || !isValidId(practitionerId)) {
      return NextResponse.json({ success: true, data: { facilities: [] } });
    }

    let ids = await sharedFacilityIds(patientId, practitionerId);
    if (user.role === "hospital_admin") {
      const own = await resolveHospitalId(user.userId, user.email);
      ids = ids.filter((id) => id === own);
    }
    const rows = ids.length
      ? await Facility.find({ _id: { $in: ids } }).select("name address inPersonEnabled").lean()
      : [];
    const facilities = rows.map((f: any) => ({
      id: String(f._id),
      name: f.name,
      address: [f.address?.street, f.address?.city].filter(Boolean).join(", "),
      inPersonEnabled: !!f.inPersonEnabled,
    }));
    return NextResponse.json({ success: true, data: { facilities } });
  } catch (err) {
    return apiError(err);
  }
}
