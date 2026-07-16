import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSession } from '@/lib/auth';
import { googleConfigured, getAuthUrl } from '@/lib/google/calendar';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (session.role !== 'OWNER') {
    return NextResponse.redirect(new URL('/workspace', req.url));
  }
  if (!googleConfigured()) {
    return NextResponse.redirect(
      new URL('/workspace/planner/settings?google=not_configured', req.url)
    );
  }

  // CSRF: random state echoed back and checked in the callback.
  const nonce = crypto.randomBytes(16).toString('hex');
  const state = `${session.organizationId}.${nonce}`;

  const res = NextResponse.redirect(getAuthUrl(state));
  res.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
