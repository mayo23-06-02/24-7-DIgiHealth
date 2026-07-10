import { createServerClient } from "@supabase/ssr";
import {
  createClient as createSupabaseJsClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  getSupabasePublishableKey,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
} from "./env";

let adminClient: SupabaseClient | null = null;

/**
 * Cookie-aware server client (publishable key) via @supabase/ssr.
 * Does NOT bypass RLS — not sufficient for media_assets CRUD.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase server client missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore if middleware refreshes sessions.
        }
      },
    },
  });
}

/**
 * Service-role admin client (server only).
 * Bypasses RLS — required for media sign/complete/list/delete.
 * Set SUPABASE_SERVICE_ROLE_KEY to the Dashboard service_role / secret key
 * (NOT the publishable key).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();

  if (!url || !key) {
    throw new Error(
      "Supabase admin not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and " +
        "SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). " +
        "Do not use the publishable key as the secret.",
    );
  }

  adminClient = createSupabaseJsClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

export function isSupabaseConfigured(): boolean {
  return isSupabaseAdminConfigured();
}
