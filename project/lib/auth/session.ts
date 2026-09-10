import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { getEntitlement } from "@/lib/billing/entitlement";

export interface SessionUser {
  identityId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

/**
 * Issues the JWT session cookie and the standard "signed in" response body.
 * Shared by the password-only path (accounts without MFA, if any are ever
 * exempted) and /api/auth/mfa/verify (the normal path — password + a code),
 * so both end up with an identical session shape.
 */
export async function createSessionResponse(user: SessionUser) {
  // Patients are gated on holding a plan, and middleware cannot reach Mongo
  // to check — so the answer is resolved once here and carried on the token.
  // A dependant on a guardian's family plan has no subscription of their own
  // and would otherwise be sent to checkout to pay a second time for cover
  // they already hold. getEntitlement resolves that, so the answer carried on
  // the token is the same one every other surface reads.
  const entitlement =
    user.role === "patient" ? await getEntitlement(user.identityId) : null;
  const hasPlan = entitlement ? entitlement.hasPlan : true;
  const coverage = entitlement ? entitlement.source : "own";

  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT({
    userId: user.identityId,
    role: user.role,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    hasPlan,
    coverage,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(secret);

  const response = NextResponse.json({
    mfaRequired: false,
    emailVerified: true,
    userId: user.identityId,
    user: {
      id: user.identityId,
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
}
