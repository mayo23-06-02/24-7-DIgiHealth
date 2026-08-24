import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { buildPractitionerInsights } from "@/lib/insights/buildPractitionerInsights";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const user = await getRequestUser();
    if (
      !user ||
      (user.role !== "practitioner" &&
        user.role !== "mega_admin" &&
        user.role !== "super_admin")
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(
      365,
      Math.max(1, parseInt(searchParams.get("days") || "30", 10) || 30),
    );

    const data = await buildPractitionerInsights(user.userId, days);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[GET /api/practitioner/insights]", err);
    return apiError(err, "Failed to load insights");
  }
}
