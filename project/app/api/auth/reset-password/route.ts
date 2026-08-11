import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import {
  validatePassword,
  validatePasswordConfirmation,
} from "@/lib/auth/passwordRules";
import { updateUserByMongoId } from "@/lib/postgres/users";

/**
 * POST /api/auth/reset-password
 *
 * Validates a reset token (from the forgot-password flow) and updates
 * the user's password. The token must be fresh and unexpired (10 minutes).
 * A token is single-use: it is cleared after a successful reset.
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { token, password, confirmPassword } = await request.json();

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { error: "Reset token is required." },
        { status: 400 },
      );
    }

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

    // Find user with a valid, unexpired reset token
    const user = await User.findOne({
      resetTokenHash: { $exists: true },
      resetTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired. Request a new one." },
        { status: 400 },
      );
    }

    // Verify the token hash
    const isValidToken = await bcrypt.compare(token, user.resetTokenHash || "");
    if (!isValidToken) {
      return NextResponse.json(
        { error: "Invalid reset token." },
        { status: 401 },
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Account is suspended. Contact support." },
        { status: 403 },
      );
    }

    // Update password and clear token
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(String(password), salt);
    user.resetTokenHash = undefined;
    user.resetTokenExpiresAt = undefined;
    await user.save();

    // Sync to Postgres
    await updateUserByMongoId(user._id.toString(), {
      password_hash: user.passwordHash,
    });

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
