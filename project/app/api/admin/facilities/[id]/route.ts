import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Facility from "@/lib/models/Facility";
import { requirePlatformAdmin, isMegaAdmin } from "@/lib/auth/admin";
import { buildHospitalOverview } from "@/lib/hospital/buildHospitalOverview";
import { logAdminAction } from "@/lib/admin/logAdminAction";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json();
    const facility = await Facility.findById(id);
    if (!facility) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (typeof body.isOpen === "boolean") {
      facility.isOpen = body.isOpen;
    }
    if (body.name && isMegaAdmin(gate.user.role)) {
      facility.name = body.name;
    }
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
