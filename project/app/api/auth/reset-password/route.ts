import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth/passwordRules";

/**
 * POST /api/auth/reset-password
 *
 * ⚠️  PLACEHOLDER — NOT SAFE FOR PRODUCTION.
 *
 * This currently resets the password for whoever the caller names, with no
 * proof they own the account. Anyone who knows an email address or SA ID can
 * take over that account. It exists so the forgot-password flow can be built
 * and demoed; it MUST be gated before this ships.
 *
 * To make it safe, add a token step and reject any request without one:
 *   1. POST /api/auth/forgot-password  -> look up the user, generate a
 *      single-use token, store its hash + expiry on the user, email the link.
 *      Always return 200 regardless of whether the account exists, so this
 *      endpoint can't be used to enumerate registered emails.
 *   2. This route then requires that token, verifies it is unexpired and
 *      unused, and clears it after a successful reset.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { identifier, password, confirmPassword } = await request.json();

    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return NextResponse.json(
        { error: "Enter the email or ID for the account." },
        { status: 400 },
      );
    }

    // Re-validate server-side: the client checks are for UX only and a caller
    // can always skip them.
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const confirmError = validatePasswordConfirmation(
      password,
      confirmPassword,
    );
    if (confirmError) {
      return NextResponse.json({ error: confirmError }, { status: 400 });
    }

    const trimmed = identifier.trim();
    const user = await User.findOne({
      $or: [{ email: trimmed }, { saId: trimmed }],
    });

    if (!user) {
      return NextResponse.json(
        { error: `No account found for '${trimmed}'.` },
        { status: 404 },
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Account is suspended. Contact support." },
        { status: 403 },
      );
    }

    // Same hashing parameters as registration (app/api/auth/register/route.ts).
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(String(password), salt);
    await user.save();

    return NextResponse.json({
      success: true,
      message: "Password updated. You can now sign in.",
    });
  } catch (error: unknown) {
    console.error("Reset Password Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
