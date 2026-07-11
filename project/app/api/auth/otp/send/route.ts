import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/lib/models/User";
import {
  applyAuthCookies,
  getAppOrigin,
  isSupabaseAuthConfigured,
  isValidEmail,
  normalizeEmail,
  sendMagicLink,
  type OtpPurpose,
} from "@/lib/supabase/auth";

/**
 * POST /api/auth/otp/send
 * Sends a Supabase magic / sign-in link (no OTP code).
 * Body: { email: string, purpose?: "verify" | "login" | "register" }
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseAuthConfigured()) {
      return NextResponse.json(
        {
          error:
            "Supabase Auth is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const email = normalizeEmail(body.email || "");
    const purpose = (body.purpose || "verify") as OtpPurpose;

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    if (!["login", "register", "verify"].includes(purpose)) {
      return NextResponse.json(
        { error: 'purpose must be "login", "register", or "verify"' },
        { status: 400 },
      );
    }

    await connectToDatabase();
    const existing = await User.findOne({ email }).lean();

    if (purpose === "login" || purpose === "verify") {
      if (!existing) {
        return NextResponse.json(
          {
            error:
              "No DigiHealth account found for this email. Please register first.",
          },
          { status: 404 },
        );
      }
      if (existing.status === "suspended") {
        return NextResponse.json(
          { error: "Account is suspended. Contact support." },
          { status: 403 },
        );
      }
    }

    if (purpose === "register" && existing) {
      return NextResponse.json(
        {
          error:
            "An account with this email already exists. Sign in or verify your email.",
        },
        { status: 409 },
      );
    }

    if (purpose === "verify" && existing?.emailVerified === true) {
      return NextResponse.json(
        {
          error: "Email is already verified. You can sign in.",
          alreadyVerified: true,
        },
        { status: 400 },
      );
    }

    const origin = getAppOrigin(req.url);
    // After clicking the link, confirm email then land on login
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(
      `/login?registered=true&verified=true&email=${encodeURIComponent(email)}`,
    )}`;

    const cookieStore = await cookies();
    const { pendingCookies, error } = await sendMagicLink({
      email,
      purpose: purpose === "verify" ? "register" : purpose,
      cookieStore,
      emailRedirectTo,
    });

    if (error) {
      const res = NextResponse.json({ error }, { status: 400 });
      return applyAuthCookies(res, pendingCookies);
    }

    const res = NextResponse.json({
      success: true,
      message: "Sign-in link sent to your email",
      email,
      purpose,
      method: "magic_link",
    });
    return applyAuthCookies(res, pendingCookies);
  } catch (err: any) {
    console.error("[POST /api/auth/otp/send]", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send sign-in link" },
      { status: 500 },
    );
  }
}
