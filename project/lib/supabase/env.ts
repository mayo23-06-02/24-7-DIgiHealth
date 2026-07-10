/**
 * Supabase env helpers.
 *
 * Supported names (any combination works):
 *   URL:          NEXT_PUBLIC_SUPABASE_URL | SUPABASE_URL
 *   Publishable:  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | SUPABASE_PUBLISHABLE_KEY
 *                 | NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   Secret:       SUPABASE_SECRET_KEY | SUPABASE_SERVICE_ROLE_KEY
 *   JWKS (opt):   SUPABASE_JWKS_URL
 */

export function getSupabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    undefined
  );
}

/** Browser / SSR public key (safe to expose) */
export function getSupabasePublishableKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    undefined
  );
}

/**
 * Server-only secret (bypasses RLS).
 * Prefer SUPABASE_SECRET_KEY (new) or SUPABASE_SERVICE_ROLE_KEY (legacy JWT).
 * Never use the publishable key here.
 */
export function getSupabaseServiceRoleKey(): string | undefined {
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    undefined;

  if (key && isPublishableKey(key)) {
    return undefined;
  }
  return key;
}

/** Optional JWKS URL for verifying Supabase Auth JWTs (if used later) */
export function getSupabaseJwksUrl(): string | undefined {
  return (
    process.env.SUPABASE_JWKS_URL?.trim() ||
    (getSupabaseUrl()
      ? `${getSupabaseUrl()}/auth/v1/.well-known/jwks.json`
      : undefined)
  );
}

export function isPublishableKey(key: string): boolean {
  if (key.startsWith("sb_publishable_")) return true;
  // Secret keys are valid admin keys
  if (key.startsWith("sb_secret_")) return false;

  const publicKeys = [
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ]
    .map((k) => k?.trim())
    .filter(Boolean) as string[];

  return publicKeys.includes(key);
}

export function isSupabasePublicConfigured(): boolean {
  return !!(getSupabaseUrl() && getSupabasePublishableKey());
}

/** True when media CRUD can run (needs secret / service_role) */
export function isSupabaseAdminConfigured(): boolean {
  return !!(getSupabaseUrl() && getSupabaseServiceRoleKey());
}
