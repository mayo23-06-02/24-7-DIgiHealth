import { NextResponse } from "next/server";
import { getRequestUser } from "@/lib/auth/getRequestUser";
import { getEntitlement } from "@/lib/billing/entitlement";
import { signSessionToken, setSessionCookie } from "@/lib/auth/sessionToken";
import { apiError } from "@/lib/api/errors";

/**
 * GET /api/billing/entitlement — does the caller hold an active plan?
 *
 * Also re-issues the session token with the current answer, so a token whose
 * `hasPlan` claim has drifted (a subscription that lapsed, or one bought in
 * another session) is corrected the next time anything asks.
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
    });
    return setSessionCookie(response, token);
  } catch (err) {
    return apiError(err, "Could not read plan status.");
  }
}
