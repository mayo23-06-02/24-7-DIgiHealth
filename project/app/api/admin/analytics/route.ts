import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { buildPlatformOverview } from "@/lib/admin/buildPlatformOverview";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();
    const days = Math.min(
      90,
      Math.max(7, parseInt(req.nextUrl.searchParams.get("days") || "30", 10)),
    );
    const data = await buildPlatformOverview(days);
    return NextResponse.json({
      success: true,
      data: {
        days,
        kpi: data.kpi,
        consultTrend: data.consultTrend,
        signupTrend: data.signupTrend,
        revenueTrend: data.revenueTrend,
        usersByRole: data.usersByRole,
        facilitiesByType: data.facilitiesByType,
        intelligence: data.intelligence,
      },
    });
  } catch (err: any) {
    return apiError(err);
  }
}
