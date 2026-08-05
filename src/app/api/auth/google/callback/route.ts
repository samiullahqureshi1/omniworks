import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { establishSessionWithLastOrg, hashPassword } from '@/lib/auth';
import { exchangeCodeForGoogleIdentity, googleAuthConfigured } from '@/lib/google/auth';

export const dynamic = 'force-dynamic';

const DEFAULT_STAGES = [
  { name: 'To Do', color: '#64748b', order: 0 },
  { name: 'In Progress', color: '#eab308', order: 1 },
  { name: 'In Review', color: '#a855f7', order: 2 },
  { name: 'Completed', color: '#22c55e', order: 3 },
];

function redirectTo(req: NextRequest, path: string) {
  const res = NextResponse.redirect(new URL(path, req.url));
  res.cookies.delete('google_auth_state');
  return res;
}

export async function GET(req: NextRequest) {
  if (!googleAuthConfigured()) {
    return redirectTo(req, '/login?error=google_not_configured');
  }

  const url = req.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  // User dismissed Google's consent screen.
  if (oauthError) return redirectTo(req, '/login?error=google_cancelled');
  if (!code || !state) return redirectTo(req, '/login?error=google_failed');

  // CSRF: the state must match the cookie we set before leaving.
  const cookieState = req.cookies.get('google_auth_state')?.value;
  if (!cookieState || cookieState !== state) {
    return redirectTo(req, '/login?error=google_state');
  }

  const mode = state.split('.')[0] === 'signup' ? 'signup' : 'login';

  const identity = await exchangeCodeForGoogleIdentity(code);
  if (!identity) return redirectTo(req, '/login?error=google_failed');

  try {
    // Match on the verified Google email. Oldest active membership wins, which is
    // the same rule password login uses.
    const existing = await prisma.user.findMany({
      where: { email: identity.email, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        organizationId: true,
        twoFactorEnabled: true,
      },
    });

    if (existing.length > 0) {
      const user = existing[0];

      // Google proves the identity but not possession of the second factor, so a
      // 2FA-enabled account still has to complete the challenge.
      if (user.twoFactorEnabled) {
        const res = NextResponse.redirect(new URL('/login?twofa=1', req.url));
        res.cookies.delete('google_auth_state');
        res.cookies.set('pending_2fa_user', user.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 300,
        });
        return res;
      }

      await establishSessionWithLastOrg(user);
      return redirectTo(req, '/workspace');
    }

    // No account yet.
    if (mode !== 'signup') {
      return redirectTo(req, '/login?error=no_account');
    }

    // ── First-time Google sign-up: create the workspace + owner ──────────────
    const displayName = identity.name || identity.email.split('@')[0];
    const base = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const slug = `${base || 'workspace'}-${Date.now().toString().slice(-4)}`;

    // Google users authenticate through Google; store an unusable random hash so
    // the password path can never match.
    const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));

    const org = await prisma.organization.create({
      data: { name: `${displayName}'s Workspace`, slug },
    });

    await prisma.projectStatus.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, organizationId: org.id })),
    });
    await prisma.taskStatus.createMany({
      data: DEFAULT_STAGES.map((s) => ({ ...s, organizationId: org.id })),
    });

    const user = await prisma.user.create({
      data: {
        name: displayName,
        email: identity.email,
        passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
        organizationId: org.id,
      },
      select: { id: true, email: true, name: true, role: true, organizationId: true },
    });

    await prisma.organization.update({
      where: { id: org.id },
      data: { ownerUserId: user.id },
    });

    await establishSessionWithLastOrg(user);
    return redirectTo(req, '/workspace');
  } catch (error) {
    console.error('[google-auth] callback failed:', error);
    return redirectTo(req, '/login?error=google_failed');
  }
}
