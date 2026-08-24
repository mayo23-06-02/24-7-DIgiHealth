import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import NextAuth from 'next-auth';
import authConfig from '@/lib/auth/auth.config';
import {
  checkLocalRateLimit,
  checkSharedRateLimit,
  sweepLocalCounters,
} from '@/lib/security/rateLimit';

const { auth } = NextAuth(authConfig);

/* ------------------------------------------------------------------ */
/*  Rate limiting                                                      */
/*                                                                     */
/*  Security-critical buckets (everything under /api/auth) count       */
/*  against a shared Postgres counter, so the budget is global rather  */
/*  than per serverless instance.                                      */
/*  High-frequency chat traffic keeps the cheap local counter: there   */
/*  the limit protects throughput, not credentials, and a database     */
/*  round trip on every message is not worth paying.                   */
/* ------------------------------------------------------------------ */

/*
 * These are per-IP allowances, and an IP is not a person: a clinic, a
 * household, or any office behind one NAT shares a single bucket across
 * everybody on it. The original limits were set as though one IP meant one
 * user, so five logins per fifteen minutes locked out a whole waiting room
 * after a handful of typos.
 *
 * The per-IP numbers are therefore sized to stop spraying, not to police an
 * individual account. Brute force against one account is bounded separately
 * inside the login route, keyed on the identifier being tried — see
 * ACCOUNT_LOGIN_LIMIT there.
 */
const RATE_LIMIT_CONFIG: Record<string, { windowMs: number; maxRequests: number }> = {
  '/api/chat/messages': { windowMs: 60_000, maxRequests: 60 },
  '/api/auth/login': { windowMs: 900_000, maxRequests: 30 },         // shared by everyone behind one IP
  '/api/auth/register': { windowMs: 3_600_000, maxRequests: 10 },    // a family signing up together
  '/api/auth/otp/send': { windowMs: 300_000, maxRequests: 10 },
  '/api/auth/otp/verify': { windowMs: 300_000, maxRequests: 15 },
  '/api/auth/forgot-password': { windowMs: 900_000, maxRequests: 10 },
  '/api/auth/reset-password': { windowMs: 900_000, maxRequests: 10 },
  default:              { windowMs: 60_000, maxRequests: 100 },
};

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Resolve which rate-limit bucket a pathname belongs to. Routes with a
 * dedicated entry in RATE_LIMIT_CONFIG get their own bucket key so that
 * high-frequency traffic on OTHER chat endpoints (message history fetches,
 * read-receipt PATCHes, conversation loads, etc.) can't eat into the
 * stricter budget reserved for sending messages, and vice versa.
 */
function getRateLimitBucket(pathname: string): { key: string; config: { windowMs: number; maxRequests: number } } {
  const config = RATE_LIMIT_CONFIG[pathname];
  return config ? { key: pathname, config } : { key: 'default', config: RATE_LIMIT_CONFIG.default };
}

/**
 * Whether this path's budget has to hold across instances. Credential-guessing
 * is the case where a per-instance counter is not merely imprecise but
 * misleading — an attacker spreading attempts across warm instances gets a
 * multiple of the documented allowance.
 */
/**
 * Auth rate limiting can be switched off for testing, where signing in and out
 * repeatedly is the whole activity and the limiter is only in the way.
 *
 * It is OFF only when DISABLE_AUTH_RATE_LIMIT is exactly "true", so an unset or
 * mistyped value leaves the protection ON. Turn it back on before real patients
 * use this: without it, password guessing against an account is unbounded.
 */
const AUTH_RATE_LIMIT_DISABLED = process.env.DISABLE_AUTH_RATE_LIMIT === 'true';

function needsSharedCounter(pathname: string): boolean {
  return pathname.startsWith('/api/auth');
}

/* ------------------------------------------------------------------ */
/*  Plan gate                                                          */
/*                                                                     */
/*  Patients must hold a plan before using the platform. The gate      */
/*  reads the `hasPlan` claim on the session token because middleware  */
/*  runs on the edge and cannot reach Mongo; the claim is refreshed at */
/*  login and after checkout. Authoritative checks stay server-side in */
/*  lib/billing/entitlement.ts.                                        */
/* ------------------------------------------------------------------ */
const PLAN_CHECKOUT_PATH = '/patient/checkout';

/**
 * Routes a patient without a plan may still reach. Checkout itself obviously,
 * plus billing — leaving those out would trap the user on a page that could
 * not load its own data or send them anywhere.
 */
function isPlanExempt(pathname: string): boolean {
  return (
    pathname === PLAN_CHECKOUT_PATH ||
    pathname.startsWith(`${PLAN_CHECKOUT_PATH}/`) ||
    pathname.startsWith('/patient/billing')
  );
}

function checkRateLimit(
  pathname: string,
  identifier: string,
  config: { windowMs: number; maxRequests: number },
): Promise<boolean> {
  return needsSharedCounter(pathname)
    ? checkSharedRateLimit(identifier, config)
    : Promise.resolve(checkLocalRateLimit(identifier, config));
}

setInterval(sweepLocalCounters, 60_000);

/* ------------------------------------------------------------------ */
/*  Dashboard roles & helpers                                          */
/* ------------------------------------------------------------------ */
const DASHBOARD_ROLES = [
  'patient',
  'practitioner',
  'hospital_admin',
  'inspector',
  'super_admin',
  'mega_admin',
];

export default auth(async function middleware(request: NextRequest & { auth: any }) {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // ---- EXEMPTION: Ably auth endpoint is never rate‑limited ----
  if (pathname === '/api/ably/auth') {
    return NextResponse.next();
  }

  // ---------- 1. Rate limiting for API routes ----------
  // Auth buckets are skipped entirely while DISABLE_AUTH_RATE_LIMIT is on, so
  // repeated sign-in / register / delete cycles during testing are not fought
  // by the limiter. Chat keeps its throughput limit either way.
  const skipAuthLimit =
    AUTH_RATE_LIMIT_DISABLED && pathname.startsWith('/api/auth');

  if (
    !skipAuthLimit &&
    (pathname.startsWith('/api/chat') ||
      pathname.startsWith('/api/ably') ||
      pathname.startsWith('/api/auth'))
  ) {
    const { key, config } = getRateLimitBucket(pathname);
    // For auth routes, bucket by IP + specific endpoint to prevent brute force attacks.
    // For chat routes, bucket by identifier + route group so high-frequency traffic
    // on other chat endpoints can't eat into the stricter budget for sending messages.
    const identifier = `${getClientIdentifier(request)}:${key}`;
    if (!(await checkRateLimit(pathname, identifier, config))) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString(),
          },
        }
      );
    }
  }

  // ---------- 2. Public routes ----------
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api/media/sign-upload-public') ||
    pathname.startsWith('/api/media/complete-public') ||
    // Vercel Cron invokes this with `Authorization: Bearer $CRON_SECRET`, not a
    // session cookie — the route itself verifies that header (see
    // app/api/cron/reminders/route.ts), so it must bypass the session gate below.
    pathname.startsWith('/api/cron/') ||
    // Public invite-token lookups (staff invite, family invite) are hit by
    // people who aren't logged in yet — that's the whole point of an invite
    // link. Each route validates the token itself; this just lets the
    // request through to reach that check instead of 401ing first.
    pathname.startsWith('/api/invites/') ||
    // Read-only doctor listing powering the public marketing pages
    // (Home, /doctors) for anonymous visitors — exact path only, not the
    // whole /api/hospital/ tree, since sibling routes (staff search, etc.)
    // are genuinely hospital_admin-only.
    pathname === '/api/hospital/doctors' ||
    // Real slot availability (from actual consultations, no fabricated
    // data) for the same public doctor cards — reveals only free/busy
    // times for a given practitionerId+date, no PII.
    pathname === '/api/bookings/slots'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;
  const user = session?.user || null;

  // The marketing homepage is public. Signed-in users skip it and land on their
  // own dashboard instead; everyone else gets the landing page (app/page.tsx).
  if (pathname === '/') {
    if (token || user) {
      try {
        let role: string | undefined;
        if (token) {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secret);
          role = payload.role as string;
        } else if (user) {
          role = user.role;
        }
        if (role) {
          return NextResponse.redirect(new URL(`/${role}`, request.url));
        }
      } catch {
        // invalid token – fall through and show the landing page
      }
    }
    return NextResponse.next();
  }

  // Login / register / verify-email / auth callback pages
  if (
    pathname === '/login' ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/auth/')
  ) {
    if (token || user) {
      try {
        let role: string | undefined;
        if (token) {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secret);
          role = payload.role as string;
        } else if (user) {
          role = user.role;
        }
        if (role) {
          return NextResponse.redirect(new URL(`/${role}`, request.url));
        }
      } catch {
        // invalid token – stay on login page
      }
    }
    return NextResponse.next();
  }

  // ---------- 3. Protected dashboard & API routes ----------
  const isDashboardRoute = DASHBOARD_ROLES.some(
    (r) => pathname === `/${r}` || pathname.startsWith(`/${r}/`)
  );
  const isApiRoute = pathname.startsWith('/api/');

  if (isDashboardRoute || isApiRoute) {
    if (!token && !user) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      let role: string | undefined;
      let userId: string | undefined;
      let hasPlan = true;

      if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        role = payload.role as string;
        userId = payload.userId as string;
        hasPlan = payload.hasPlan !== false;
      } else if (user) {
        role = user.role;
        userId = user.id;
      }

      // ---- Plan gate ----
      // A patient without an active plan can only reach checkout. Applies to
      // patients alone: gating a practitioner or an admin would lock staff out
      // of a platform they never buy a plan for.
      if (role === 'patient' && !hasPlan && isDashboardRoute && !isPlanExempt(pathname)) {
        return NextResponse.redirect(new URL(PLAN_CHECKOUT_PATH, request.url));
      }

      // Role mismatch protection
      if (isDashboardRoute && role) {
        const attemptedRole = DASHBOARD_ROLES.find(
          (r) => pathname === `/${r}` || pathname.startsWith(`/${r}/`)
        );
        if (attemptedRole && role !== attemptedRole) {
          return NextResponse.redirect(new URL(`/${role}`, request.url));
        }
      }

      // Forward user info to downstream handlers
      const requestHeaders = new Headers(request.headers);
      if (role) requestHeaders.set('x-user-role', role);
      if (userId) requestHeaders.set('x-user-id', userId);

      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    } catch (error) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};