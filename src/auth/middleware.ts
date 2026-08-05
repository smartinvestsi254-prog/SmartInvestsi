import { NextResponse } from "next/server";
import type { NextRequest } from "next/request";

// Define protected URL sub-trees
const PROTECTED_ROUTES = ["/admin", "/api/admin", "/api/diplomacy"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route requires authorization
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Extract token from HttpOnly cookies or the Auth Header
    const sessionToken = request.cookies.get("si_token")?.value;
    const authHeader = request.headers.get("authorization");
    
    // If no token exists at all, block the transition instantly
    if (!sessionToken && !authHeader) {
      // If it's an API request, return a clean HTTP 401 JSON packet
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }
      
      // If it's a page navigation request, bounce them instantly to sign-in
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

// Optimize middleware execution scope via matchers
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/diplomacy/:path*"],
};
