import { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    /*
     * Re-issue, carrying the plan claims forward.
     *
     * They were being dropped. Because an absent `hasPlan` reads as "has one"
     * (see the fallback in proxy.ts), refreshing a token was a way to clear
     * the paywall — and it would now have cleared family coverage too, sending
     * a dependant whose cover had lapsed to checkout instead of the notice.
     * Copied from the verified payload rather than re-read from the database:
     * a refresh renews the same session, it does not re-decide it.
     */
    const newToken = await new SignJWT({
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      hasPlan: payload.hasPlan,
      coverage: payload.coverage,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .sign(secret);

    const response = NextResponse.json({ success: true });
    response.cookies.set("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 },
    );
  }
}
