import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { requirePlatformAdmin } from "@/lib/auth/admin";
import { escapeRegex } from "@/lib/escapeRegex";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const gate = await requirePlatformAdmin();
    if (gate.error) return gate.error;
    await connectToDatabase();

    const sp = req.nextUrl.searchParams;
    const search = sp.get("search") || "";
    const role = sp.get("role") || "";
    const status = sp.get("status") || "";
    const sort = sp.get("sort") || "createdAt";
    const sortDir = sp.get("sortDir") === "asc" ? 1 : -1;
    const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(sp.get("limit") || "25", 10)));

    const q: any = {};
    if (role) q.role = role;
    if (status) q.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      q.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }

    const sortField = ["createdAt", "firstName", "email", "role", "status"].includes(sort)
      ? sort
      : "createdAt";

    const [total, users] = await Promise.all([
      User.countDocuments(q),
      User.find(q)
        .select("firstName lastName email role status mfaEnabled createdAt mobile")
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: (users as any[]).map((u) => ({
          id: u._id.toString(),
          firstName: u.firstName,
          lastName: u.lastName,
          name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          email: u.email,
          role: u.role,
          status: u.status || "active",
          mfaEnabled: !!u.mfaEnabled,
          mobile: u.mobile || "",
          createdAt: u.createdAt,
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
    console.error("[GET /api/admin/users]", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 },
    );
  }
}
