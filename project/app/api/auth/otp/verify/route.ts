import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { normalizeEmail } from "@/lib/supabase/auth";
import { updateUserByMongoId } from "@/lib/postgres/users";

/**
 * POST /api/auth/otp/verify
 * Confirms the 6-digit code and, on success, activates the account and
 * logs the user in (issues the session cookie) in the same step.
 * Body: { email: string, code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email || "");
    const code = String(body.code || "").trim();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required" },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        alreadyVerified: true,
        message: "Email is already verified. You can sign in.",
      });
    }

    if (!user.otpCodeHash || !user.otpExpiresAt) {
      return NextResponse.json(
        { error: "No verification code is pending. Request a new one." },
        { status: 400 },
      );
    }

    if (user.otpExpiresAt < new Date()) {
      return NextResponse.json(
        { error: "This code has expired. Request a new one." },
        { status: 410 },
      );
    }

    const isMatch = await bcrypt.compare(code, user.otpCodeHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect verification code" },
        { status: 401 },
      );
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.status = "active";
    user.otpCodeHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    await updateUserByMongoId(user._id.toString(), {
      email_verified: true,
      email_verified_at: user.emailVerifiedAt,
      status: "active",
      otp_code_hash: null,
      otp_expires_at: null,
    });

    // Verifying an address confirms the mailbox; it is not an authentication.
    // This used to mint a session and sign the user straight in, so anyone
    // holding the emailed code got an authenticated session without ever
    // presenting the password. They now go to the sign-in screen instead.
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        firstName: user.firstName,
      },
    });

    return response;
  } catch (err: any) {
    console.error("[POST /api/auth/otp/verify]", err);
    return NextResponse.json(
      { error: "Failed to verify code. Please try again." },
      { status: 500 },
    );
  }
}
