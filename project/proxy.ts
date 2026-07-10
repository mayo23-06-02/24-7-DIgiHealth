import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import NextAuth from 'next-auth';
import authConfig from '@/lib/auth/auth.config';

const { auth } = NextAuth(authConfig);

/* ------------------------------------------------------------------ */
/*  Rate‑limit map (in‑memory – replace with Redis in production)      */
/* ------------------------------------------------------------------ */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_CONFIG: Record<string, { windowMs: number; maxRequests: number }> = {
  '/api/chat/messages': { windowMs: 60_000, maxRequests: 60 },
  default:              { windowMs: 60_000, maxRequests: 100 },
};

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(identifier: string, config: { windowMs: number; maxRequests: number }): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return true;
  }
  if (record.count >= config.maxRequests) return false;
  record.count++;
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) rateLimitMap.delete(key);
  }
}, 60_000);

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
  if (pathname.startsWith('/api/chat') || pathname.startsWith('/api/ably')) {
    const config = RATE_LIMIT_CONFIG[pathname] ?? RATE_LIMIT_CONFIG.default;
    const identifier = getClientIdentifier(request);
    if (!checkRateLimit(identifier, config)) {
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
    pathname.startsWith('/api/upload/temp')
  ) {
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const token = request.cookies.get('token')?.value;
  const user = session?.user || null;

  // Login / register pages
  if (
    pathname === '/login' ||
    pathname.startsWith('/register')
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

      if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        role = payload.role as string;
        userId = payload.userId as string;
      } else if (user) {
        role = user.role;
        userId = user.id;
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