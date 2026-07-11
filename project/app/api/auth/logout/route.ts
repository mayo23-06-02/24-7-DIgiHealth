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
