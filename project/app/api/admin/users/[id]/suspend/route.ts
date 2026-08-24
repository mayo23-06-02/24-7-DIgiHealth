import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { requirePlatformAdmin, isMegaAdmin } from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { updateUserByMongoId } from "@/lib/postgres/users";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (user.role === "mega_admin" && !isMegaAdmin(gate.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user._id.toString() === gate.user.userId) {
      return NextResponse.json(
        { error: "Cannot suspend yourself" },
        { status: 400 },
      );
    }

    const action = body.action === "unsuspend" ? "unsuspend" : "suspend";
    user.status = action === "unsuspend" ? "active" : "suspended";
    await user.save();
    await updateUserByMongoId(id, { status: user.status });

    await logAdminAction({
      actor: gate.user,
      action: `user.${action}`,
      targetType: "user",
      targetId: id,
      metadata: { reason: body.reason || null },
    });

    return NextResponse.json({
      success: true,
      data: { id, status: user.status },
    });
  } catch (err: any) {
    return apiError(err);
  }
}
