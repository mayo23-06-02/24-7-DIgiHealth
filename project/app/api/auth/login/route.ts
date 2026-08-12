import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

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
 * Migration note (Phase 3): reads from Postgres first, falling back to
 * Mongo for any account not yet synced there.
 */
async function findLoginUser(identifier: string): Promise<LoginUser | null> {
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
    .eq("email", identifier)
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
    console.warn("[login] Postgres lookup failed, falling back to Mongo:", error.message);
  }

  await connectToDatabase();
  const user = await User.findOne({
    $or: [{ email: identifier }, { saId: identifier }],
  });
  if (!user) return null;

  return {
    identityId: user._id.toString(),
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

    if (!user || !usablePasswordHash || !isMatch) {
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

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const token = await new SignJWT({
      userId: user.identityId,
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
