import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

/**
 * POST /api/auth/login
 * Password login. Blocked until the account's email is verified via
 * the 6-digit code sent at registration (see /api/auth/otp/*).
 */
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 },
      );
    }

    const user = await User.findOne({
      $or: [{ email: identifier.trim() }, { saId: identifier.trim() }],
    });

    if (!user) {
      return NextResponse.json(
        {
          error: `User with email or ID '${identifier.trim()}' not found`,
        },
        { status: 401 },
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Account is suspended. Contact support." },
        { status: 403 },
      );
    }

    if (
      !user.passwordHash ||
      user.passwordHash.startsWith("otp_only:")
    ) {
      return NextResponse.json(
        {
          error:
            "This account has no password set. Complete registration with a password, or contact support.",
        },
        { status: 401 },
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password entered" },
        { status: 401 },
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email before signing in.",
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 },
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({
      mfaRequired: false,
      emailVerified: true,
      userId: user._id.toString(),
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        firstName: user.firstName,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
