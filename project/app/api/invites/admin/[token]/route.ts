import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PlatformInvite from "@/lib/models/PlatformInvite";

import { apiError } from "@/lib/api/errors";

/**
 * GET /api/invites/admin/[token] — public lookup used by the registration
 * wizard to confirm a platform-admin-issued invite (from User Management)
 * before the invitee fills anything in. No auth: they aren't signed in yet.
 *
 * Deliberately a separate route from /api/invites/[token] (hospital-staff
 * invites) and /api/invites/family/[token] (family invites) rather than
 * merged into either — those are read by existing wizard effects keyed to
 * one specific role, and mixing lookup sources risks one invite type's
 * fetch clobbering another's state when both listen on the same query
 * param for the same role.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    await connectToDatabase();
    const { token } = await params;

    const invite = await PlatformInvite.findOne({ token }).lean();
    if (!invite) {
      return NextResponse.json(
        { success: false, error: "This invite link is not valid." },
        { status: 404 },
      );
    }

    const inv = invite as any;

    if (inv.status === "accepted") {
      return NextResponse.json(
        { success: false, error: "This invite has already been used." },
        { status: 410 },
      );
    }
    if (inv.status === "cancelled") {
      return NextResponse.json(
        { success: false, error: "This invite is no longer active." },
        { status: 410 },
      );
    }
    if (new Date(inv.expiresAt) < new Date()) {
      if (inv.status !== "expired") {
        await PlatformInvite.findByIdAndUpdate(inv._id, { status: "expired" });
      }
      return NextResponse.json(
        {
          success: false,
          error: "This invite has expired. Ask your admin to resend it.",
        },
        { status: 410 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { email: inv.email, role: inv.role },
    });
  } catch (error: any) {
    console.error("[GET /api/invites/admin/[token]]", error);
    return apiError(error);
  }
}
