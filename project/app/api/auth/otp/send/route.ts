import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { issueOtpCode } from "@/lib/auth/otp";
import { normalizeEmail, isValidEmail } from "@/lib/supabase/auth";

/**
 * POST /api/auth/otp/send
 * Sends a 6-digit verification code by email.
 * Body: { email: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email || "");

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "No DigiHealth account found for this email. Please register first." },
        { status: 404 },
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Account is suspended. Contact support." },
        { status: 403 },
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({
        alreadyVerified: true,
        message: "Email is already verified. You can sign in.",
      });
    }

    const { error } = await issueOtpCode({
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
    });

    if (error) {
      return NextResponse.json(
        { error: `Failed to send verification code: ${error}` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      email,
    });
  } catch (err: any) {
    console.error("[POST /api/auth/otp/send]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send verification code" },
      { status: 500 },
    );
  }
}
