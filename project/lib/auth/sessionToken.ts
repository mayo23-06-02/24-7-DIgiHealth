import { SignJWT, jwtVerify } from "jose";
import type { NextResponse } from "next/server";

const MAX_AGE_SECONDS = 86400;

export type SessionClaims = {
  userId: string;
  role: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  /**
   * Whether this account holds an active plan.
   *
   * Carried on the token so middleware can enforce the plan gate without a
   * database round trip on every request — the edge runtime cannot reach
   * Mongo, and the gate has to run on every dashboard navigation.
   *
   * It is a cache, not the source of truth. `getEntitlement()` is, and every
   * API that grants something re-checks it there. The claim only decides
   * whether to let a page render or send the user to checkout, so the worst a
   * stale claim can do is route someone to a checkout page that immediately
   * redirects them back out.
   */
  hasPlan?: boolean;
};

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret());
}

export async function readSessionToken(
  token: string,
): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

/** Apply the session cookie with the options used everywhere it is issued. */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
