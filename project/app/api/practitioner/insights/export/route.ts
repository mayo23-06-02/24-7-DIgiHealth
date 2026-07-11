import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { buildPractitionerInsights } from "@/lib/insights/buildPractitionerInsights";
import { buildInsightsPdf } from "@/lib/pdf/buildInsightsPdf";
import { pdfResponse } from "@/lib/pdf/createPdfDocument";

export const runtime = "nodejs";

/**
 * GET /api/practitioner/insights/export?days=30
 * Branded PDF with charts + intelligence for the logged-in practitioner.
 */
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.min(
      365,
      Math.max(1, parseInt(searchParams.get("days") || "30", 10) || 30),
    );

    const data = await buildPractitionerInsights(user.userId, days);
    const { buffer } = await buildInsightsPdf(data);

    const safeName = (data.practitioner.lastName || "Practitioner").replace(
      /\s+/g,
      "_",
    );
    const filename = `Clinical_Insights_${safeName}_${days}d_${new Date().toISOString().slice(0, 10)}.pdf`;
    return pdfResponse(buffer, filename);
  } catch (err: any) {
    console.error("[GET /api/practitioner/insights/export]", err);
    return NextResponse.json(
      { error: err.message || "Failed to export insights PDF" },
      { status: 500 },
    );
  }
}
