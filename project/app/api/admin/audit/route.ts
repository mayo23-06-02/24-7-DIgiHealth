import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import AuditLog from "@/lib/models/AuditLog";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { escapeRegex } from "@/lib/escapeRegex";

import { apiError } from "@/lib/api/errors";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const action = sp.get("action") || "";
    const search = sp.get("search") || "";
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(sp.get("limit") || "40", 10)));

    const q: any = {};
    if (action) q.action = new RegExp(escapeRegex(action), "i");
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      q.$or = [{ actorEmail: re }, { action: re }, { targetId: re }];
    }

    const [total, rows] = await Promise.all([
      AuditLog.countDocuments(q),
      AuditLog.find(q)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        logs: (rows as any[]).map((a) => ({
          id: a._id.toString(),
          action: a.action,
          actorRole: a.actorRole,
          actorEmail: a.actorEmail || "",
          targetType: a.targetType || "",
          targetId: a.targetId || "",
          metadata: a.metadata || {},
          createdAt: a.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (err: any) {
    return apiError(err);
  }
}
