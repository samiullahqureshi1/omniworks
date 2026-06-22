import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

const COOKIE_NAME = 'omnitrack_session';
const JWT_SECRET = process.env.JWT_SECRET || 'omnitrack-super-secret-jwt-key-2026';

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
