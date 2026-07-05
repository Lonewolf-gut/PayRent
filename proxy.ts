import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/properties",
  "/roles",
  "/terms",
  "/privacy",
  "/faq",
  "/pricing",
  "/api/auth",
  "/api/properties",
  "/api/subscriptions/plans",
  "/admin/login",
];

const authRoutes = ["/login", "/register"];
const authCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

function hasAuthCookie(req: NextRequest) {
  return authCookieNames.some((name) => !!req.cookies.get(name)?.value);
}

export function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const isLoggedIn = hasAuthCookie(req);
  const pathname = nextUrl.pathname;

  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = authRoutes.includes(pathname);
  const isApiRoute = pathname.startsWith("/api");

  if (isApiRoute) return NextResponse.next();

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (!isPublic && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname);
    const loginPath = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    return NextResponse.redirect(
      new URL(`${loginPath}?callbackUrl=${callbackUrl}`, nextUrl)
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
