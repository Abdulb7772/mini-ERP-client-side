import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Allow public routes
  if (
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/verify-email") ||
    path === "/" ||
    path.startsWith("/about") ||
    path.startsWith("/contact") ||
    path.startsWith("/blog") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  // Get the token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only-change-in-production",
  });

  // Check if user is authenticated
  if (!token) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // ⚠️ SECURITY CHECK: Only customers can access protected routes on client-side
  if (token.role !== "customer") {
    console.log("🚫 [Middleware] Access denied: Non-customer attempting to access protected route");
    console.log("🚫 [Middleware] User role:", token.role);
    console.log("🚫 [Middleware] Attempted path:", path);
    
    // Redirect to login page with error message
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "AccessDenied");
    return NextResponse.redirect(url);
  }

  // Allow the request to continue
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.svg|.*\\.webp).*)",
  ],
};
