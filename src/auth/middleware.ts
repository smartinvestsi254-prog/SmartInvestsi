import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt'; // Or use your custom JWT / session reader

// Configurable Exception Routes (Publicly Accessible)
const PUBLIC_PATHS = [
  '/pricing',
  '/upgrade',
  '/login',
  '/signup',
  '/api/auth',
  '/api/webhooks', // Stripe / Payment Webhooks MUST be public
  '/_next',
  '/favicon.ico',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow static files, assets, and public routes
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublic) {
    return NextResponse.next();
  }

  // 2. Retrieve user session/token securely on the server
  // Adjust secret key to match your env config
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // 3. Unauthenticated Users -> Redirect to Login or Pricing
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isAdmin = token.isAdmin === true;
  const isPremium = token.isPremium === true;

  // 4. ADMIN ROLE: Grant access to EVERYTHING
  if (isAdmin) {
    return NextResponse.next();
  }

  // 5. ADMIN ROUTE PROTECTION: Block non-admins from /admin
  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // 6. PREMIUM GATE: Block free/unpaid users from gated routes
  if (!isPremium) {
    const pricingUrl = new URL('/pricing', req.url);
    pricingUrl.searchParams.set('reason', 'premium_required');
    pricingUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(pricingUrl);
  }

  // 7. User is Premium -> Allow access
  return NextResponse.next();
}

// Apply Middleware to all routes except standard static files & images
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (.svg, .png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
