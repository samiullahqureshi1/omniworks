import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exchangeCodeForTokens, fetchGoogleUserInfo } from '@/lib/google/calendar';
import { getOrCreateOrgSettings } from '@/app/actions/availability';
import { createGoogleMeetWorkspaceSubscription } from '@/lib/google/workspaceEvents';

function settingsRedirect(req: NextRequest, status: string) {
  return NextResponse.redirect(new URL(`/workspace/planner/settings?google=${status}`, req.url));
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL('/login', req.url));
  if (session.role !== 'OWNER') return NextResponse.redirect(new URL('/workspace', req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) return settingsRedirect(req, 'denied');
  if (!code || !state) return settingsRedirect(req, 'error');

  // CSRF + org check: state must match the cookie and belong to this org.
  const cookieState = req.cookies.get('google_oauth_state')?.value;
  if (!cookieState || cookieState !== state || !state.startsWith(`${session.organizationId}.`)) {
    return settingsRedirect(req, 'error');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Google only returns a refresh token on first consent; prompt=consent
      // forces it, but guard anyway.
      return settingsRedirect(req, 'no_refresh_token');
    }

    const googleUser = tokens.access_token ? await fetchGoogleUserInfo(tokens.access_token) : null;
    const email = googleUser?.email ?? null;

    await getOrCreateOrgSettings(session.organizationId, session.userId);
    await prisma.organizationSettings.update({
      where: { organizationId: session.organizationId },
      data: {
        googleRefreshToken: tokens.refresh_token,
        googleConnectedEmail: email,
      },
    });

    // Attempt Google Workspace Event subscription for Pub/Sub topic
    try {
      await createGoogleMeetWorkspaceSubscription(
        session.organizationId,
        tokens.refresh_token,
        googleUser?.id
      );
    } catch (subErr: any) {
      console.warn('[Google Meet Subscription Notice]:', subErr.message);
    }

    const res = settingsRedirect(req, 'connected');
    res.cookies.delete('google_oauth_state');
    return res;
  } catch (e: any) {
    console.error('[Google OAuth Callback Error]:', e);
    return settingsRedirect(req, 'error');
  }
}
