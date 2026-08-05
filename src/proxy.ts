import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'omnitrack_session';

/**
 * This proxy is a UX gate, not a security boundary: it only checks whether a
 * session cookie is PRESENT, so unauthenticated visitors get bounced to /login
 * instead of flashing an empty workspace. The token is never verified here — no
 * signing secret is needed (and none is imported, so it can't leak into the edge
 * bundle). Every page, server action and API route independently verifies the
 * session via getSession(), which is where authentication is actually enforced.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and internal Next.js assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  const isPublicRoute = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/invite');
  const isProtectedRoute = pathname.startsWith('/workspace');

  if (!token && isProtectedRoute) {
    // Redirect to login if user is accessing a protected route without being authenticated
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // We remove the strict redirect from /login to /workspace in middleware
  // because if the database is reset, the token is technically present but invalid,
  // causing an infinite redirect loop between /workspace (which rejects it) and /login.

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
