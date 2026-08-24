import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getEntitlement } from "@/lib/billing/entitlement";

/**
 * A real bcrypt digest that no supplied password can match. Compared against
 * when the account doesn't exist (or has no usable password) so a failed login
 * costs the same wall-clock time either way — otherwise the timing difference
 * leaks which accounts are registered.
 */
const DUMMY_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

interface LoginUser {
  /**
   * Session identity used in the JWT. Prefers the Mongo `_id` when a row
   * has one (so every not-yet-migrated collection, which still stores
   * foreign keys as Mongo ObjectIds, keeps resolving), falling back to the
   * Postgres uuid for accounts with no Mongo origin at all (e.g. rows from
   * scripts/seed-supabase.ts). Once every domain reads from Postgres, this
   * can be simplified to always use the Postgres id.
   */
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
 * Resolve the account to authenticate against.
 *
 * **Mongo is the single source of truth for credentials.** Every auth write —
 * registration, password reset, OTP issue and verify — writes Mongo first and
 * mirrors to Postgres afterwards on a best-effort basis. So Mongo is always at
 * least as fresh, and reading it first means a mirror that failed to update
 * cannot change the outcome of a login.
 *
 * This used to read Postgres first, which made the mirror authoritative for
 * exactly the fields it was least reliable about. Two lockouts came from it:
 * a stale password_hash rejected the correct password, and a stale
 * email_verified sent a verified user to the verify-email page — where
 * /api/auth/otp/send, which reads Mongo, refused to issue a code because the
 * address was already verified. No way out of that loop from the UI.
 *
 * Postgres remains the fallback for accounts that exist only there (seeded by
 * scripts/seed-supabase.ts), which have no Mongo row to find.
 */
async function findLoginUser(identifier: string): Promise<LoginUser | null> {
  await connectToDatabase();

  /*
   * Addresses are stored lower-cased (User schema sets `lowercase: true`), so
   * an identifier typed with any capitals matched nothing and the account was
   * told its credentials were invalid. Phone keyboards capitalise the first
   * letter by default, which made this easy to hit and impossible to diagnose
   * from the error message.
   *
   * SA ID numbers are digits, so lower-casing is a no-op for that branch.
   */
  const normalized = identifier.toLowerCase();

  const mongoUser = await User.findOne({
    $or: [{ email: normalized }, { saId: identifier }],
  });

  if (mongoUser) {
    return {
      identityId: mongoUser._id.toString(),
      email: mongoUser.email,
      passwordHash: mongoUser.passwordHash,
      role: mongoUser.role,
      status: mongoUser.status,
      firstName: mongoUser.firstName,
      lastName: mongoUser.lastName,
      emailVerified: mongoUser.emailVerified,
    };
  }

  return findPostgresOnlyUser(identifier, normalized);
}

/** Accounts with no Mongo row at all — seeded straight into Postgres. */
async function findPostgresOnlyUser(
  identifier: string,
  normalized: string,
): Promise<LoginUser | null> {
  // Two separate parameterized .eq() lookups rather than a single .or()
  // filter string — PostgREST's .or() syntax interpolates the raw string,
  // so passing user input straight into it (commas/periods/parens are
  // filter-syntax metacharacters there) would be an injection risk.
  const columns =
    "id, mongo_id, email, password_hash, role, status, first_name, last_name, email_verified, sa_id";
  const supabase = getSupabaseAdmin();

  let { data, error } = await supabase
    .from("users")
    .select(columns)
    .eq("email", normalized)
    .maybeSingle();

  if (!error && !data) {
    ({ data, error } = await supabase
      .from("users")
      .select(columns)
      .eq("sa_id", identifier)
      .maybeSingle());
  }

  if (!error && data) {
    // `mongo_id` is the link between the two stores, and it is null on every
    // Postgres row that predates the backfill. Falling straight through to
    // `data.id` there hands out a Postgres uuid as the session identity for an
    // account that also exists in Mongo — and the rest of the app (Mongo
    // collections, their FKs, the admin user list, AuditLog.actorId) speaks
    // ObjectIds. That split identity is what silently broke audit writes for
    // mega_admin. So when the link is missing, look for a Mongo counterpart by
    // the same identifier before settling for the uuid.
    let identityId: string = data.mongo_id;

    if (!identityId) {
      await connectToDatabase();
      const mongoUser = await User.findOne({
        $or: [{ email: data.email }, { saId: identifier }],
      })
        .select("_id")
        .lean<{ _id: unknown } | null>();

      if (mongoUser?._id) {
        identityId = String(mongoUser._id);

        // Self-heal: persist the link so the next login skips this lookup and
        // every other reader of `mongo_id` starts resolving too. Best-effort —
        // a failure here must not block a valid login.
        const { error: linkError } = await supabase
          .from("users")
          .update({ mongo_id: identityId })
          .eq("id", data.id);

        if (linkError) {
          console.warn(
            "[login] could not backfill users.mongo_id",
            { email: data.email, error: linkError.message },
          );
        }
      } else {
        // Genuinely Postgres-only (e.g. seeded by scripts/seed-supabase.ts).
        identityId = data.id;
      }
    }

    return {
      identityId,
      email: data.email,
      passwordHash: data.password_hash,
      role: data.role,
      status: data.status,
      firstName: data.first_name,
      lastName: data.last_name,
      emailVerified: data.email_verified,
    };
  }
  if (error) {
    console.warn("[login] Postgres lookup failed:", error.message);
  }

  // No Mongo retry here — the caller has already looked there, and this is
  // only reached when that found nothing.
  return null;
}

/**
 * POST /api/auth/login
 * Password login. Blocked until the account's email is verified via
 * the 6-digit code sent at registration (see /api/auth/otp/*).
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

    // Patients are gated on holding a plan, and middleware cannot reach Mongo
    // to check — so the answer is resolved once here and carried on the token.
    // See lib/auth/sessionToken.ts for why this is a cache, not the truth.
    const hasPlan =
      user.role === "patient"
        ? (await getEntitlement(user.identityId)).hasPlan
        : true;

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({
      userId: user.identityId,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      hasPlan,
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
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
