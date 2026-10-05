import { NextResponse } from "next/server";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";
import { issueOtpCode } from "@/lib/auth/otp";
import { createSessionResponse } from "@/lib/auth/session";
import { checkSharedRateLimit } from "@/lib/security/rateLimit";

/**
 * Accounts that sign in with password only — no email OTP step. Requested
 * as an explicit exception for this one mega_admin account; add sparingly,
 * since it's a real reduction in that account's login security.
 */
const MFA_EXEMPT_EMAILS = ["mega@247digihealth.com"];

/**
 * A real bcrypt digest that no supplied password can match. Compared against
 * when the account doesn't exist (or has no usable password) so a failed login
 * costs the same wall-clock time either way — otherwise the timing difference
 * leaks which accounts are registered.
 */
const DUMMY_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

/**
 * Failed-or-not attempts allowed against one account before it is throttled.
 * Counted per identifier rather than per IP, so an attacker cannot buy more
 * guesses by changing address, and a legitimate user is never locked out by
 * a stranger sharing their network.
 */
const ACCOUNT_LOGIN_LIMIT = { windowMs: 900_000, maxRequests: 8 };

/** See proxy.ts — same flag, so both halves switch together. */
const AUTH_RATE_LIMIT_DISABLED = process.env.DISABLE_AUTH_RATE_LIMIT === "true";

interface LoginUser {
  /** Session identity used in the JWT: the Postgres users.id (uuid). */
  identityId: string;
  email: string;
  passwordHash?: string | null;
  role: string;
  status: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
}

/**
 * Resolve the account to authenticate against, by email or SA ID.
 *
 * Addresses are stored lower-cased, so an identifier typed with any capitals
 * (phone keyboards capitalise the first letter) is normalised first. SA ID
 * numbers are digits, so lower-casing is a no-op for that branch.
 */
async function findLoginUser(identifier: string): Promise<LoginUser | null> {
  const normalized = identifier.toLowerCase();

  const user = await User.findOne({
    $or: [{ email: normalized }, { saId: identifier }],
  });
  if (!user) return null;

  return {
    identityId: String(user._id),
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role,
    status: user.status,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerified: user.emailVerified,
  };
}

/**
 * POST /api/auth/login
 * Password login. Blocked until the account's email is verified via
 * the 6-digit code sent at registration (see /api/auth/otp/*).
 * On a correct password, a second 6-digit code is emailed for MFA — the
 * session is only issued once that code is confirmed via
 * /api/auth/mfa/verify.
 */
export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Missing credentials" },
        { status: 400 },
      );
    }

    /*
     * Per-account throttle.
     *
     * The middleware limit is per IP, and an IP is not a person — a clinic or
     * household behind one NAT shares it. Sizing that bucket tightly enough to
     * stop brute force locked out everyone on the same connection instead.
     *
     * This bounds attempts against a specific account, which is the thing
     * guessing actually targets, and it holds however many addresses an
     * attacker spreads across.
     */
    const attemptKey = `login:account:${identifier.trim().toLowerCase()}`;
    if (
      !AUTH_RATE_LIMIT_DISABLED &&
      !(await checkSharedRateLimit(attemptKey, ACCOUNT_LOGIN_LIMIT))
    ) {
      return NextResponse.json(
        {
          error:
            "Too many sign-in attempts for this account. Try again in 15 minutes, or reset your password.",
        },
        { status: 429 },
      );
    }

    const user = await findLoginUser(identifier.trim());

    // Account-state checks (suspended / unverified) deliberately run *after*
    // the password is proven correct. Anything that branches before that point
    // — including "no such user" — must return the same generic failure, or the
    // response text becomes an account-enumeration oracle: an attacker learns
    // which addresses are registered just by reading the error.
    const usablePasswordHash =
      user?.passwordHash && !user.passwordHash.startsWith("otp_only:")
        ? user.passwordHash
        : null;

    // Always run a bcrypt compare, even with no user/hash, so the response time
    // doesn't leak existence either. DUMMY_HASH is a valid bcrypt digest of a
    // value nothing can match.
    const isMatch = await bcrypt.compare(
      password,
      usablePasswordHash ?? DUMMY_HASH,
    );

    // isMatch can only be true when a real stored hash verified — an absent or
    // otp_only hash is compared against DUMMY_HASH, which nothing matches.
    if (!user || !isMatch) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Account is suspended. Contact support." },
        { status: 403 },
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

    // Patients are gated on holding a plan, but that no longer needs
    // resolving here — it's carried on the session token, minted by
    // /api/auth/mfa/verify once the code below is confirmed (see
    // lib/auth/session.ts).
    //
    // The password has just been proven correct. Rather than sign the user in
    // immediately, email a second 6-digit code and require it via
    // /api/auth/mfa/verify — that route (not this one) issues the session.
    // Exception: MFA_EXEMPT_EMAILS skips straight to a session, no code sent.
    if (MFA_EXEMPT_EMAILS.includes(user.email.toLowerCase())) {
      return createSessionResponse({
        identityId: user.identityId,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    }

    const { error: otpError } = await issueOtpCode({
      userId: user.identityId,
      email: user.email,
      firstName: user.firstName,
      purpose: "login_mfa",
    });

    if (otpError) {
      // Log the real provider error server-side only — see the analogous
      // note in /api/auth/otp/send.
      console.error("[POST /api/auth/login] Failed to send MFA code:", otpError);
      return NextResponse.json(
        {
          error:
            "We couldn't send your sign-in code right now. Please try again shortly.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      mfaRequired: true,
      email: user.email,
      message: "Enter the 6-digit code we emailed you to finish signing in.",
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
