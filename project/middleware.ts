import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import NextAuth from "next-auth";
import authConfig from "@/src/auth.config";

const { auth } = NextAuth(authConfig);

const DASHBOARD_ROLES = [
  "patient",
  "practitioner",
  "hospital_admin",
  "inspector",
  "super_admin",
  "mega_admin",
];

export default auth(async function middleware(request: any) {
  const { pathname } = request.nextUrl;
  const session = request.auth; // NextAuth session

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/upload/temp")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = request.cookies.get("token")?.value;
  const user = session?.user || null;

  if (pathname === "/" || pathname === "/login" || pathname.startsWith("/register")) {
    if (token || user) {
      try {
        let role;
        if (token) {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET);
          const { payload } = await jwtVerify(token, secret);
          role = payload.role as string;
        } else {
          role = user.role;
        }

        if (role) {
          return NextResponse.redirect(
            new URL(`/${role}`, request.url),
          );
        }
      } catch (err) {
        // Token is invalid, let them view the login page
      }
    }
    return NextResponse.next();
  }

  const isDashboardRoute = DASHBOARD_ROLES.some(
    (r) => pathname === `/${r}` || pathname.startsWith(`/${r}/`),
  );
  const isApiRoute = pathname.startsWith("/api/");

  if (isDashboardRoute || isApiRoute) {
    if (!token && !user) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      let role;
      let userId;

      if (token) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);
        role = payload.role as string;
        userId = payload.userId as string;
      } else {
        role = user.role;
        userId = user.id;
      }

      if (isDashboardRoute) {
        const attemptedRole = DASHBOARD_ROLES.find(
          (r) => pathname === `/${r}` || pathname.startsWith(`/${r}/`),
        );
        if (attemptedRole && role !== attemptedRole) {
          return NextResponse.redirect(new URL(`/${role}`, request.url));
        }
      }

      const requestHeaders = new Headers(request.headers);
      if (role) requestHeaders.set("x-user-role", role);
      if (userId) requestHeaders.set("x-user-id", userId);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      if (isApiRoute) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const response = NextResponse.redirect(new URL("/login", request.url));
      response.cookies.delete("token");
      return response;
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

