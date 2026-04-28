import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { SignJWT } from "jose";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const { userId, token: mfaToken } = await request.json();

    if (!userId || !mfaToken) {
      return NextResponse.json({ error: "Invalid Token" }, { status: 400 });
    }

    const user = await User.findById(userId);
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Prototype bypass: Accept any 6 digit token
    if (mfaToken.length < 6) {
      return NextResponse.json(
        { error: "Invalid 6-digit MFA code" },
        { status: 401 },
      );
    }

    const responsePayload = {
      success: true,
      user: {
        id: user._id.toString(),
        role: user.role,
        email: user.email,
      },
    };

    const response = NextResponse.json(responsePayload);

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({
      userId: user._id.toString(),
      role: user.role,
      email: user.email,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return response;
  } catch (error) {
    console.error("MFA Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
