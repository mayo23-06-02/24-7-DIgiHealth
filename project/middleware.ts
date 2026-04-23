import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const DASHBOARD_ROLES = [
  'patient',
  'practitioner',
  'hospital_admin',
  'inspector',
  'super_admin',
  'mega_admin'
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Exclude auth API endpoints and temp uploads
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/api/upload/temp')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  // Protect Login / Register purely if they HAVE a valid token
  if (pathname === '/login' || pathname.startsWith('/register')) {
    if (token) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
        const { payload } = await jwtVerify(token, secret);
        if (payload && payload.role) {
          return NextResponse.redirect(new URL(`/${payload.role}`, request.url));
        }
      } catch (err) {
        // Token is invalid, let them view the login page
      }
    }
    return NextResponse.next();
  }

  const isDashboardRoute = DASHBOARD_ROLES.some(r => pathname === `/${r}` || pathname.startsWith(`/${r}/`));
  const isApiRoute = pathname.startsWith('/api/');

  if (isDashboardRoute || isApiRoute) {
    if (!token) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Verify token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'secret123!');
      const { payload } = await jwtVerify(token, secret);
      const role = payload.role as string;

      if (isDashboardRoute) {
        // Enforce role-based isolation
        const attemptedRole = DASHBOARD_ROLES.find(r => pathname === `/${r}` || pathname.startsWith(`/${r}/`));
        if (attemptedRole && role !== attemptedRole) {
          return NextResponse.redirect(new URL(`/${role}`, request.url));
        }
      }

      // Pass role and uid downstream
      const requestHeaders = new Headers(request.headers);
      if (role) requestHeaders.set('x-user-role', role);
      if (payload.userId) requestHeaders.set('x-user-id', payload.userId as string);
      
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

    } catch (error) {
      // Token exists but signature failed or expired
      if (isApiRoute) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Redirect to login to refresh session or re-authenticate
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
