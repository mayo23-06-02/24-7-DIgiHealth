import { NextResponse } from "next/server";

/**
 * POST /api/auth/otp/verify
 * OTP codes are no longer used. Email is confirmed via Supabase magic link
 * at GET /auth/callback.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "OTP codes are disabled. Open the sign-in link in your email, or request a new link from /verify-email.",
      code: "MAGIC_LINK_ONLY",
    },
    { status: 410 },
  );
}
