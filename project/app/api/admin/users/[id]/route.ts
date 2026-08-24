import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  requirePlatformAdmin,
  canAssignRole,
  isMegaAdmin,
} from "@/lib/auth/admin";
import { logAdminAction } from "@/lib/admin/logAdminAction";
import { updateUserByMongoId } from "@/lib/postgres/users";

import { apiError } from "@/lib/api/errors";
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
    const u = await User.findById(id)
      .select("firstName lastName email role status mfaEnabled createdAt mobile saId")
      .lean();
    if (!u) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        id: (u as any)._id.toString(),
        firstName: (u as any).firstName,
        lastName: (u as any).lastName,
        name: `${(u as any).firstName || ""} ${(u as any).lastName || ""}`.trim(),
        email: (u as any).email,
        role: (u as any).role,
        status: (u as any).status || "active",
        mfaEnabled: !!(u as any).mfaEnabled,
        mobile: (u as any).mobile || "",
        createdAt: (u as any).createdAt,
      },
    });
  } catch (err: any) {
    return apiError(err);
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
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Super cannot modify mega admins
    if (user.role === "mega_admin" && !isMegaAdmin(gate.user.role)) {
      return NextResponse.json(
        { error: "Cannot modify mega admin" },
        { status: 403 },
      );
    }

    const updates: any = {};
    if (body.status && ["active", "suspended", "pending_verification"].includes(body.status)) {
      updates.status = body.status;
    }
    if (body.role) {
      if (!canAssignRole(gate.user.role, body.role)) {
        return NextResponse.json(
          { error: "You cannot assign this role" },
          { status: 403 },
        );
      }
      updates.role = body.role;
    }
    if (body.firstName) updates.firstName = String(body.firstName).trim();
    if (body.lastName) updates.lastName = String(body.lastName).trim();

    Object.assign(user, updates);
    await user.save();

    const pgUpdates: Record<string, unknown> = {};
    if (updates.status) pgUpdates.status = updates.status;
    if (updates.role) pgUpdates.role = updates.role;
    if (updates.firstName) pgUpdates.first_name = updates.firstName;
    if (updates.lastName) pgUpdates.last_name = updates.lastName;
    if (Object.keys(pgUpdates).length) {
      await updateUserByMongoId(id, pgUpdates);
    }

    await logAdminAction({
      actor: gate.user,
      action: "user.update",
      targetType: "user",
      targetId: id,
      metadata: updates,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: user._id.toString(),
        role: user.role,
        status: user.status,
        name: `${user.firstName} ${user.lastName}`,
      },
    });
  } catch (err: any) {
    return apiError(err);
  }
}
