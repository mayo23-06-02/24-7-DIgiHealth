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

    // Every account with a live reset token is a candidate, and the supplied
    // token is checked against each in turn.
    //
    // This used to be a findOne, which returned whichever single account Mongo
    // happened to order first. With more than one reset in flight, a person
    // holding a perfectly valid token was compared against a different
    // account's hash and told their link was invalid — the reset simply failed
    // for everyone but one arbitrary user until the tokens expired.
    const candidates = await User.find({
      resetTokenHash: { $exists: true, $ne: null },
      resetTokenExpiresAt: { $gt: new Date() },
    });

    let user = null;
    for (const candidate of candidates) {
      if (await bcrypt.compare(token, candidate.resetTokenHash || "")) {
        user = candidate;
        break;
      }
    }

    // One message for "no live tokens", "token doesn't match" and "expired".
    // Distinguishing them would confirm which accounts have a reset pending.
    if (!user) {
      return NextResponse.json(
        { error: "Reset link is invalid or has expired. Request a new one." },
        { status: 400 },
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Account is suspended. Contact support." },
        { status: 403 },
      );
    }

    // A reset has to actually change something. Without this, a link could be
    // spent re-setting the same password the account already has, which leaves
    // the person believing they have rotated a credential they have not — the
    // worst case being a reset requested precisely because the old password
    // was thought compromised.
    if (user.passwordHash) {
      const sameAsCurrent = await bcrypt.compare(
        String(password),
        user.passwordHash,
      );
      if (sameAsCurrent) {
        return NextResponse.json(
          {
            error:
              "That is already your current password. Choose a different one.",
          },
          { status: 400 },
        );
      }
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
