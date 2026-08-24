/**
 * Rate limiting with a shared counter.
 *
 * Runs inside middleware (edge runtime), so this talks to Postgres over
 * PostgREST rather than through the Node Supabase client. The counter lives in
 * the `rate_limits` table and is incremented by the `check_rate_limit` function
 * (see supabase/migrations/009_rate_limits.sql), which does the increment and
 * the window roll in one statement so instances can't race each other.
 *
 * A local Map is kept as a fallback for two cases: the shared store being
 * unreachable, and buckets where a per-request round trip isn't worth it.
 */

export type RateLimitConfig = { windowMs: number; maxRequests: number };

const localCounters = new Map<string, { count: number; resetTime: number }>();

/** Local, per-instance counting. Leaky across instances by construction. */
function checkLocal(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const record = localCounters.get(identifier);
  if (!record || now > record.resetTime) {
    localCounters.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return true;
  }
  if (record.count >= config.maxRequests) return false;
  record.count++;
  return true;
}

/** Drop expired local entries so the Map can't grow without bound. */
export function sweepLocalCounters(): void {
  const now = Date.now();
  for (const [key, value] of localCounters.entries()) {
    if (now > value.resetTime) localCounters.delete(key);
  }
}

let warnedUnavailable = false;

function supabaseConfig(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Count this request against the shared budget.
 *
 * Returns true if the request is allowed. If the shared store cannot be
 * reached, falls back to local counting and allows the request through that
 * path instead — an outage of the counter store must not lock everyone out of
 * logging in, which would turn a hardening measure into an availability
 * incident.
 */
export async function checkSharedRateLimit(
  identifier: string,
  config: RateLimitConfig,
): Promise<boolean> {
  const cfg = supabaseConfig();
  if (!cfg) return checkLocal(identifier, config);

  try {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/check_rate_limit`, {
      method: "POST",
      headers: {
        apikey: cfg.key,
        authorization: `Bearer ${cfg.key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        p_key: identifier,
        p_window_ms: config.windowMs,
        p_max: config.maxRequests,
      }),
      // A slow counter must not become a slow login. If Postgres doesn't
      // answer quickly, fall through to local counting.
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) throw new Error(`rate limit rpc ${res.status}`);
    const allowed = await res.json();
    if (typeof allowed !== "boolean") throw new Error("unexpected rpc payload");
    return allowed;
  } catch (err) {
    if (!warnedUnavailable) {
      warnedUnavailable = true;
      console.warn(
        "[rateLimit] shared counter unavailable, falling back to per-instance counting. " +
          "Apply supabase/migrations/009_rate_limits.sql if this persists.",
        err,
      );
    }
    return checkLocal(identifier, config);
  }
}

export { checkLocal as checkLocalRateLimit };
