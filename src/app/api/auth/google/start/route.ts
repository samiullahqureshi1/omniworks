import { NextRequest, NextResponse } from 'next/server';
import { rateLimitShared, RATE_LIMITS, getClientIpFromRequest } from '@/lib/rate-limit';
import crypto from 'crypto';
import { googleAuthConfigured, getGoogleLoginUrl } from '@/lib/google/auth';

export const dynamic = 'force-dynamic';

/**
 * Kicks off "Continue with Google".
 *   /api/auth/google/start?mode=login   -> must already have an account
 *   /api/auth/google/start?mode=signup  -> creates a workspace on first sign-in
 */
export async function GET(req: NextRequest) {
  if (!googleAuthConfigured()) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
  }

  const rl = await rateLimitShared(`oauth-start:${getClientIpFromRequest(req)}`, RATE_LIMITS.OAUTH);
  if (!rl.ok) {
    return NextResponse.redirect(new URL('/login?error=rate_limited', req.url));
  }

  const mode = req.nextUrl.searchParams.get('mode') === 'signup' ? 'signup' : 'login';

  // CSRF: a random nonce echoed back through Google and re-checked in the callback.
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = `${mode}.${nonce}`;

  const res = NextResponse.redirect(getGoogleLoginUrl(state));
  res.cookies.set('google_auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
