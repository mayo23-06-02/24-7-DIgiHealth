import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { getEntitlement } from "@/lib/billing/entitlement";
import { signSessionToken, setSessionCookie } from "@/lib/auth/sessionToken";
import { apiError } from "@/lib/api/errors";

/**
 * GET /api/billing/entitlement — does the caller hold an active plan?
 *
 * Also re-issues the session token with the current answer, so a token whose
 * claims have drifted (a subscription that lapsed, one bought in another
 * session, or a guardian's family plan that stopped covering this account) is
 * corrected the next time anything asks.
 */
export async function GET() {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const entitlement = await getEntitlement(user.userId);

    // Only patients are gated, so nobody else needs the claim maintained.
    if (user.role !== "patient") {
      return NextResponse.json({
        success: true,
        data: { ...entitlement, gated: false },
      });
    }

    const response = NextResponse.json({
      success: true,
      data: { ...entitlement, gated: true },
    });

    const token = await signSessionToken({
      userId: user.userId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPlan: entitlement.hasPlan,
      // Carried too, not just hasPlan. This route exists to correct a drifted
      // token, so omitting the claim would have it quietly undo itself —
      // stripping `coverage` sends the reader back to the boolean fallback,
      // and a dependant whose cover had lapsed would be routed to checkout
      // instead of the notice.
      coverage: entitlement.source,
    });
    return setSessionCookie(response, token);
  } catch (err) {
    return apiError(err, "Could not read plan status.");
  }
}
