import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { buildPlatformOverview } from "@/lib/admin/buildPlatformOverview";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();
    const days = Math.min(
      90,
      Math.max(7, parseInt(req.nextUrl.searchParams.get("days") || "30", 10) || 30),
    );
    const data = await buildPlatformOverview(days);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[GET /api/admin/overview]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
