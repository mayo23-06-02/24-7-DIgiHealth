import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { normalizeEmail } from "@/lib/supabase/auth";
import { issueOtpCode } from "@/lib/auth/otp";
import { checkSharedRateLimit } from "@/lib/security/rateLimit";

const MFA_RESEND_LIMIT = { windowMs: 900_000, maxRequests: 5 };

/** See proxy.ts — same flag, so both halves switch together. */
const AUTH_RATE_LIMIT_DISABLED = process.env.DISABLE_AUTH_RATE_LIMIT === "true";

/**
 * POST /api/auth/mfa/resend
 * Re-issues a sign-in code for a login already in progress (the "Resend
 * code" link on the MFA step).
 *
 * Responds identically whether or not the account exists/is suspended, so
 * this can't be used to enumerate registered emails from the login screen.
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email || "");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const attemptKey = `mfa:resend:${email}`;
    if (
      !AUTH_RATE_LIMIT_DISABLED &&
      !(await checkSharedRateLimit(attemptKey, MFA_RESEND_LIMIT))
    ) {
      return NextResponse.json(
        {
          error: "Too many requests. Please wait before requesting another code.",
        },
        { status: 429 },
      );
    }

    const genericResponse = () =>
      NextResponse.json({
        success: true,
        message: "If an account exists for this email, a new code has been sent.",
      });

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user || user.status === "suspended") {
      return genericResponse();
    }

    const { error } = await issueOtpCode({
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      purpose: "login_mfa",
    });

    if (error) {
      console.error("[POST /api/auth/mfa/resend] Email provider error:", error);
      return NextResponse.json(
        { error: "We couldn't send the code right now. Please try again shortly." },
        { status: 502 },
      );
    }

    return genericResponse();
  } catch (err: any) {
    console.error("[POST /api/auth/mfa/resend]", err);
    return NextResponse.json(
      { error: "Failed to resend code. Please try again." },
      { status: 500 },
    );
  }
}
