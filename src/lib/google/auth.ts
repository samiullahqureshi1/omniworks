import { OAuth2Client } from 'google-auth-library';

/**
 * Google **sign-in** OAuth.
 *
 * Deliberately separate from src/lib/google/calendar.ts, which handles the
 * per-organization Calendar/Meet connection. That flow asks for calendar +
 * meetings scopes and stores a refresh token; this one only needs to learn who
 * the person is, so it requests nothing beyond identity and never persists a
 * Google token.
 */

/** Identity only — no calendar, no offline access. */
export const GOOGLE_LOGIN_SCOPES = ['openid', 'email', 'profile'];

/**
 * Its own redirect URI, because Google matches the callback exactly.
 * Set GOOGLE_AUTH_REDIRECT_URI, or it is derived from NEXT_PUBLIC_APP_URL.
 */
export function getLoginRedirectUri(): string {
  return (
    process.env.GOOGLE_AUTH_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
  );
}

export function googleAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getLoginOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getLoginRedirectUri()
  );
}

/**
 * Consent URL for signing in. `prompt=select_account` lets a person pick which
 * Google account to use instead of silently reusing the last one.
 */
export function getGoogleLoginUrl(state: string): string {
  return getLoginOAuthClient().generateAuthUrl({
    access_type: 'online',
    prompt: 'select_account',
    scope: GOOGLE_LOGIN_SCOPES,
    state,
  });
}

export interface GoogleIdentity {
  email: string;
  name: string | null;
  emailVerified: boolean;
}

/**
 * Exchanges the callback code for the signed-in person's identity.
 *
 * The id_token is verified against Google's keys (audience = our client id), so
 * the email cannot be forged by replaying a token issued for another app.
 * Returns null when the code is invalid or the email is unverified.
 */
export async function exchangeCodeForGoogleIdentity(code: string): Promise<GoogleIdentity | null> {
  try {
    const client = getLoginOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.id_token) return null;

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) return null;

    // Never trust an unverified Google email — it would allow account takeover of
    // any local account sharing that address. A missing claim counts as unverified.
    if (payload.email_verified !== true) return null;

    return {
      email: payload.email.toLowerCase(),
      name: payload.name ?? null,
      emailVerified: true,
    };
  } catch (error) {
    console.error('[google-auth] code exchange failed:', error);
    return null;
  }
}
