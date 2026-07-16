import { OAuth2Client } from 'google-auth-library';

/**
 * Google Calendar + Meet integration (per-organization OAuth).
 *
 * Each org connects its own Google account once; we store that org's refresh
 * token in OrganizationSettings.googleRefreshToken. Booking then creates a
 * Calendar event with a Google Meet link (conferenceData) on that calendar.
 */

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
];

export function googleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI
  );
}

export function getOAuthClient(): OAuth2Client {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/** Consent URL. `access_type=offline` + `prompt=consent` guarantees a refresh token. */
export function getAuthUrl(state: string): string {
  return getOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens; // { refresh_token, access_token, id_token, expiry_date, ... }
}

/** Fetch the connected account's email using an access token. */
export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.email ?? null;
  } catch {
    return null;
  }
}

async function getAccessTokenFromRefresh(refreshToken: string): Promise<string> {
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { token } = await client.getAccessToken();
  if (!token) throw new Error('Could not obtain Google access token.');
  return token;
}

export interface CreateMeetEventInput {
  refreshToken: string;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  timezone: string;
  attendeeEmails: string[];
}

export interface CreateMeetEventResult {
  eventId: string;
  meetLink: string | null;
  htmlLink: string | null;
}

/**
 * Create a Calendar event with a Google Meet link and email the attendees.
 * Uses the Calendar REST API with conferenceDataVersion=1 so a Meet space is
 * provisioned via conferenceData.createRequest.
 */
export async function createCalendarMeetEvent(
  input: CreateMeetEventInput
): Promise<CreateMeetEventResult> {
  const accessToken = await getAccessTokenFromRefresh(input.refreshToken);

  const body = {
    summary: input.summary,
    description: input.description || undefined,
    start: { dateTime: input.startIso, timeZone: input.timezone },
    end: { dateTime: input.endIso, timeZone: input.timezone },
    attendees: input.attendeeEmails.filter(Boolean).map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `omniwork-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const res = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Calendar event creation failed (${res.status}): ${text}`);
  }

  const event = await res.json();
  const meetLink =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri ||
    null;

  return { eventId: event.id, meetLink, htmlLink: event.htmlLink ?? null };
}
