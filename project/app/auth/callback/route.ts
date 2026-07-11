import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  applyAuthCookies,
  createRouteHandlerSupabase,
  getAppOrigin,
  normalizeEmail,
} from "@/lib/supabase/auth";

export const runtime = "nodejs";

/**
 * GET /auth/callback
 * Supabase magic-link / email confirmation landing page.
 * Exchanges code (or token_hash) for a session, marks DigiHealth emailVerified,
 * then redirects to login (password sign-in). Does not issue DigiHealth JWT.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = getAppOrigin(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") || "email";
  const next =
    url.searchParams.get("next") ||
    "/login?registered=true&verified=true";

  const fail = (message: string) => {
    const dest = new URL("/verify-email", origin);
    dest.searchParams.set("error", message);
    return NextResponse.redirect(dest);
  };

  try {
    if (!code && !tokenHash) {
      return fail("Missing verification link parameters. Request a new link.");
    }

    const cookieStore = await cookies();
    const { supabase, pendingCookies } =
      createRouteHandlerSupabase(cookieStore);

    let supabaseUserId: string | null = null;
    let email: string | null = null;

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.user) {
        return fail(error?.message || "Invalid or expired sign-in link.");
      }
      supabaseUserId = data.user.id;
      email = normalizeEmail(data.user.email || "");
    } else if (tokenHash) {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "email" | "signup" | "magiclink" | "invite",
      });
      if (error || !data.user) {
        return fail(error?.message || "Invalid or expired sign-in link.");
      }
      supabaseUserId = data.user.id;
      email = normalizeEmail(data.user.email || "");
    }

    if (!email || !supabaseUserId) {
      return fail("Could not read email from the verification link.");
    }

    await connectToDatabase();
    const user = await User.findOne({ email });
    if (!user) {
      const dest = new URL("/register", origin);
      dest.searchParams.set(
        "error",
        "No DigiHealth account for this email. Please register first.",
      );
      return NextResponse.redirect(dest);
    }

    if (user.status === "suspended") {
      return fail("Account is suspended. Contact support.");
    }

    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
    user.supabaseUid = supabaseUserId;
    if (user.status === "pending_verification") {
      user.status = "active";
    }
    await user.save();

    // Sign out of Supabase session — app auth is password + DigiHealth JWT
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }

    const dest = new URL(next, origin);
    if (!dest.searchParams.get("email")) {
      dest.searchParams.set("email", email);
    }
    if (!dest.searchParams.get("verified")) {
      dest.searchParams.set("verified", "true");
    }

    const res = NextResponse.redirect(dest);
    return applyAuthCookies(res, pendingCookies);
  } catch (e: any) {
    console.error("[GET /auth/callback]", e);
    return fail(e?.message || "Email verification failed.");
  }
}
