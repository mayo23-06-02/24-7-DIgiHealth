/**
 * Supabase Auth — magic / sign-in links for email verification
 * (no 6-digit OTP codes).
 *
 * After the user clicks the link, DigiHealth marks emailVerified and they
 * sign in with email + password (JWT cookie `token`).
 */
import {
  createServerClient,
  type CookieOptions,
} from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabasePublicConfigured,
} from "./env";

/** login = sign-in OTP (unused for password login); register = signup; verify = post-registration email confirm */
export type OtpPurpose = "login" | "register" | "verify";

export interface CookieToSet {
  name: string;
  value: string;
  options: CookieOptions;
}

/** True when browser/public Supabase Auth can run */
export function isSupabaseAuthConfigured(): boolean {
  return isSupabasePublicConfigured();
}

/**
 * Cookie-aware Supabase client for Route Handlers.
 * Collects cookie mutations so the caller can apply them to the final NextResponse.
 */
export function createRouteHandlerSupabase(cookieStore: {
  getAll: () => { name: string; value: string }[];
}) {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    throw new Error(
      "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  const pendingCookies: CookieToSet[] = [];

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach((c) => pendingCookies.push(c));
      },
    },
  });

  return { supabase, pendingCookies };
}

/** Apply collected Supabase cookies onto a NextResponse */
export function applyAuthCookies(
  response: NextResponse,
  pendingCookies: CookieToSet[],
): NextResponse {
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options);
  }
  return response;
}

/**
 * Admin client for privileged auth ops (optional).
 * Prefer route-handler client for OTP so user session cookies are set.
 */
export function getSupabaseAuthAdmin() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

const PRODUCTION_ORIGIN = "https://24-7-d-igi-health.vercel.app";

/** Public site origin for magic-link redirects */
export function getAppOrigin(requestUrl?: string): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const isLocalOrigin = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

  if (requestUrl) {
    try {
      const requestOrigin = new URL(requestUrl).origin;
      // A real (non-local) request is the source of truth — don't let a
      // stale/misconfigured localhost env var override it and leak
      // localhost links into production emails.
      if (!isLocalOrigin(requestOrigin) && (!fromEnv || isLocalOrigin(fromEnv))) {
        return requestOrigin;
      }
    } catch {
      /* fall through */
    }
  }

  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      /* fall through */
    }
  }
  return PRODUCTION_ORIGIN;
}

/**
 * Send a Supabase magic / sign-in link (email only — no OTP code).
 * User clicks the link → /auth/callback → email marked verified.
 */
export async function sendMagicLink(params: {
  email: string;
  purpose: OtpPurpose;
  cookieStore: { getAll: () => { name: string; value: string }[] };
  /** Absolute redirect after clicking the email link */
  emailRedirectTo: string;
}): Promise<{ pendingCookies: CookieToSet[]; error: string | null }> {
  const email = normalizeEmail(params.email);
  if (!isValidEmail(email)) {
    return { pendingCookies: [], error: "Enter a valid email address." };
  }

  const { supabase, pendingCookies } = createRouteHandlerSupabase(
    params.cookieStore,
  );

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: params.emailRedirectTo,
      // Prefer magic link email; disable embedding OTP in some projects via template
    },
  });

  if (error) {
    const msg = error.message || "Failed to send sign-in link";
    if (/signups not allowed|user not found|unable to validate/i.test(msg)) {
      return {
        pendingCookies,
        error:
          params.purpose === "login"
            ? "No account found for this email. Please register first."
            : msg,
      };
    }
    return { pendingCookies, error: msg };
  }

  return { pendingCookies, error: null };
}

/** @deprecated Use sendMagicLink — kept for any residual imports */
export async function sendEmailOtp(params: {
  email: string;
  purpose: OtpPurpose;
  cookieStore: { getAll: () => { name: string; value: string }[] };
  emailRedirectTo?: string;
}): Promise<{ pendingCookies: CookieToSet[]; error: string | null }> {
  return sendMagicLink({
    ...params,
    emailRedirectTo:
      params.emailRedirectTo ||
      `${getAppOrigin()}/auth/callback?next=/login`,
  });
}

export interface DigiHealthJwtPayload {
  userId: string;
  role: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

/** Issue DigiHealth app JWT (used by proxy + APIs) */
export async function issueDigiHealthToken(
  payload: DigiHealthJwtPayload,
): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(secret));
}

export function setDigiHealthTokenCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
}

export function clearDigiHealthTokenCookie(response: NextResponse): void {
  response.cookies.set("token", "", {
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
}

/** Unusable password placeholder for OTP-only accounts (passwordHash kept optional) */
export function otpOnlyPasswordPlaceholder(): string {
  return `otp_only:${crypto.randomUUID()}`;
}
