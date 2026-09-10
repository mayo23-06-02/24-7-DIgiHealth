import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { normalizeEmail } from "@/lib/supabase/auth";
import { updateUserByMongoId } from "@/lib/postgres/users";
import { checkSharedRateLimit } from "@/lib/security/rateLimit";
import { createSessionResponse } from "@/lib/auth/session";

/** A 6-digit code is only ~1M combinations — keep guesses tightly bounded. */
const MFA_VERIFY_LIMIT = { windowMs: 900_000, maxRequests: 8 };

/** See proxy.ts — same flag, so both halves switch together. */
const AUTH_RATE_LIMIT_DISABLED = process.env.DISABLE_AUTH_RATE_LIMIT === "true";

/**
 * POST /api/auth/mfa/verify
 * Confirms the 6-digit sign-in code emailed by /api/auth/login and, on
 * success, issues the session cookie.
 *
 * Deliberately separate from /api/auth/otp/verify: that route also flips
 * emailVerified/status, which only makes sense for a first-time email
 * confirmation. This is a routine login step and must never touch either
 * field.
 * Body: { email: string, code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email || "");
    const code = String(body.code || "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 },
      );
    }

    const attemptKey = `mfa:verify:${email}`;
    if (
      !AUTH_RATE_LIMIT_DISABLED &&
      !(await checkSharedRateLimit(attemptKey, MFA_VERIFY_LIMIT))
    ) {
      return NextResponse.json(
        {
          error:
            "Too many attempts. Please request a new code and try again shortly.",
        },
        { status: 429 },
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Account is suspended. Contact support." },
        { status: 403 },
      );
    }

    if (!user.otpCodeHash || !user.otpExpiresAt) {
      return NextResponse.json(
        { error: "No sign-in code is pending. Please sign in again." },
        { status: 400 },
      );
    }

    if (user.otpExpiresAt < new Date()) {
      return NextResponse.json(
        {
          error: "This code has expired. Please sign in again to get a new one.",
        },
        { status: 410 },
      );
    }

    const isMatch = await bcrypt.compare(code, user.otpCodeHash);
    if (!isMatch) {
      return NextResponse.json({ error: "Incorrect code" }, { status: 401 });
    }

    user.otpCodeHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    await updateUserByMongoId(user._id.toString(), {
      otp_code_hash: null,
      otp_expires_at: null,
    });

    return createSessionResponse({
      identityId: user._id.toString(),
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (err: any) {
    console.error("[POST /api/auth/mfa/verify]", err);
    return NextResponse.json(
      { error: "Failed to verify code. Please try again." },
      { status: 500 },
    );
  }
}
