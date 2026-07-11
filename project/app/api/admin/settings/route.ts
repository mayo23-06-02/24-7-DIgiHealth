import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SystemConfig } from "@/lib/models/System";
import { requirePlatformAdmin, requireMegaAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/logAdminAction";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

    let cfg = await SystemConfig.findById("singleton").lean();
    if (!cfg) {
      await SystemConfig.create({
        _id: "singleton",
        maintenanceMode: false,
        features: {
          telehealth: true,
          aiDiagnizer: true,
          prescriptions: true,
          registrations: true,
        },
        popiaVersion: "1.0",
        consultationFeeDefault: 0,
        emergencyNumbers: ["112", "10177"],
        supportedLanguages: ["en", "af", "zu"],
      });
      cfg = await SystemConfig.findById("singleton").lean();
    }

    return NextResponse.json({
      success: true,
      data: cfg,
      canEdit: gate.user.role === "mega_admin",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const gate = await requireMegaAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

    const body = await req.json();
    const updates: any = {};
    if (typeof body.maintenanceMode === "boolean") {
      updates.maintenanceMode = body.maintenanceMode;
    }
    if (body.features && typeof body.features === "object") {
      updates.features = body.features;
    }
    if (body.popiaVersion) updates.popiaVersion = body.popiaVersion;
    if (typeof body.consultationFeeDefault === "number") {
      updates.consultationFeeDefault = body.consultationFeeDefault;
    }
    if (Array.isArray(body.emergencyNumbers)) {
      updates.emergencyNumbers = body.emergencyNumbers;
    }
    if (Array.isArray(body.supportedLanguages)) {
      updates.supportedLanguages = body.supportedLanguages;
    }

    const cfg = await SystemConfig.findByIdAndUpdate(
      "singleton",
      { $set: updates },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();

    await logAdminAction({
      actor: gate.user,
      action: "settings.update",
      targetType: "system",
      targetId: "singleton",
      metadata: updates,
    });

    return NextResponse.json({ success: true, data: cfg });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
