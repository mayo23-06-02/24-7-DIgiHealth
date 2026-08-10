import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  applyAuthCookies,
  clearDigiHealthTokenCookie,
  createRouteHandlerSupabase,
  isSupabaseAuthConfigured,
} from "@/lib/supabase/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearDigiHealthTokenCookie(response);
  // Guard against a stale impersonation cookie surviving on a shared device
  // (see app/api/patient/family/[memberId]/switch/route.ts).
  response.cookies.delete("guardian_token");

  if (isSupabaseAuthConfigured()) {
    try {
      const cookieStore = await cookies();
      const { supabase, pendingCookies } =
        createRouteHandlerSupabase(cookieStore);
      await supabase.auth.signOut();
      applyAuthCookies(response, pendingCookies);
    } catch (e) {
      console.warn("[logout] Supabase signOut skipped", e);
    }
  }

  return response;
}
