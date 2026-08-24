import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { resolveHospitalId } from "@/lib/hospital/resolveHospitalId";
import { buildHospitalOverview } from "@/lib/hospital/buildHospitalOverview";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (!user || user.role !== "hospital_admin") {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const hospitalId = await resolveHospitalId(user.userId, user.email);
    const data = await buildHospitalOverview(
      hospitalId,
      user.firstName || "Administrator",
    );

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[GET /api/hospital/dashboard]", error);
    return apiError(error);
  }
}
