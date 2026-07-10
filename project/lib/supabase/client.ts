import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

/**
 * Browser Supabase client (publishable / anon key).
 * Use for optional client-side Storage helpers; app auth remains Mongo JWT.
 */
export function createClient() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase browser client missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseKey);
}

/** @deprecated Prefer createClient() — kept for existing imports */
export function getSupabaseBrowser() {
  return createClient();
}
