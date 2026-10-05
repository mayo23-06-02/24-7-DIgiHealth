import { NextResponse } from "next/server";
import Facility from "@/lib/models/Facility";
import { apiError } from "@/lib/api/errors";

export const runtime = "nodejs";

/** Hospital names for the registration wizard's first step. Names and city only. */
export async function GET() {
  try {
    const facilities = await Facility.find().select("name address.city facilityType").sort({ name: 1 }).limit(500).lean();
    return NextResponse.json({
      success: true,
      data: facilities.map((f) => ({
        id: String(f._id),
        name: f.name,
        city: f.address?.city ?? null,
        type: f.facilityType ?? null,
      })),
    });
  } catch (err) {
    return apiError(err);
  }
}
