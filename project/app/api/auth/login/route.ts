import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

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

    // Try finding by email or SA ID
    const user = await User.findOne({
      $or: [{ email: identifier.trim() }, { saId: identifier.trim() }],
    });

    if (!user) {
      return NextResponse.json(
        { error: `User with email or ID '${identifier.trim()}' not found` },
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

    const responsePayload = {
      mfaRequired: user.mfaEnabled,
      userId: user._id.toString(),
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
        firstName: user.firstName,
      },
    };

    const response = NextResponse.json(responsePayload);

    // Set secure cookie if MFA is bypassed or disabled
    if (!user.mfaEnabled) {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const token = await new SignJWT({
        userId: user._id.toString(),
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("24h") // or '15m' if implementing refresh flow
        .sign(secret);

      response.cookies.set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 86400, // 1 day
      });
    }

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: String(error.stack),
      },
      { status: 500 },
    );
  }
}
