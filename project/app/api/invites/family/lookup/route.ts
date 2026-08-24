import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import FamilyLink from "@/lib/models/FamilyLink";
import User from "@/lib/models/User";
import { apiError } from "@/lib/api/errors";

/**
 * POST /api/invites/family/lookup — is there a pending family invite for this
 * address?
 *
 * Used at the review step of registration, so someone who signed up on their
 * own rather than through the emailed link is still offered the choice to join
 * the family that invited them.
 *
 * It deliberately does NOT return the invite token. The token is the bearer
 * credential that claims the invite; handing it back for any address typed
 * into a form would let anyone claim a place in a stranger's family account.
 * The caller only learns that an invite exists and who sent it — the actual
 * linking is done server-side at registration, keyed on the address the new
 * account is created with, which the user must then verify by email.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ success: true, data: { pending: false } });
    }

    await connectToDatabase();

    const invite = (await FamilyLink.findOne({
      inviteEmail: email,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean()) as any;

    if (
      !invite ||
      (invite.inviteExpiresAt && new Date(invite.inviteExpiresAt) < new Date())
    ) {
      return NextResponse.json({ success: true, data: { pending: false } });
    }

    const guardian = (await User.findById(invite.guardianId)
      .select("firstName lastName")
      .lean()) as any;

    return NextResponse.json({
      success: true,
      data: {
        pending: true,
        guardianName: guardian
          ? `${guardian.firstName} ${guardian.lastName}`.trim()
          : "A 24/7 DigiHealth user",
        relationship: invite.relationship || null,
      },
    });
  } catch (error) {
    return apiError(error, "Could not check for a family invite.");
  }
}
