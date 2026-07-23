import { getAccessTokenFromRefresh, fetchGoogleUserInfo } from './calendar';
import { prisma } from '@/lib/db';

const PUB_SUB_TOPIC = 'projects/email-syncing-472610/topics/omniwork-meet-events';

const VALID_MEET_EVENT_TYPES = [
  'google.workspace.meet.conference.v2.ended',
  'google.workspace.meet.recording.v2.fileGenerated',
  'google.workspace.meet.transcript.v2.fileGenerated',
];

/**
 * Creates a Google Workspace Event subscription for Google Meet conference lifecycle events.
 * If a subscription already exists (409), saves the existing ID and does not throw.
 * Target Topic: projects/email-syncing-472610/topics/omniwork-meet-events
 */
export async function createGoogleMeetWorkspaceSubscription(
  organizationId: string,
  refreshToken: string,
  googleUserId?: string | null,
  spaceCode?: string | null
) {
  const accessToken = await getAccessTokenFromRefresh(refreshToken);

  let userId = googleUserId;
  if (!userId && !spaceCode) {
    const userInfo = await fetchGoogleUserInfo(accessToken);
    userId = userInfo?.id ?? null;
  }

  // Construct targetResource candidates supported by Google Workspace Events API for Meet
  const candidates: string[] = [];

  if (spaceCode) {
    const cleanSpace = spaceCode
      .replace(/^https:\/\/meet\.google\.com\//, '')
      .replace(/^spaces\//, '');
    candidates.push(`//meet.googleapis.com/spaces/${cleanSpace}`);
  }

  if (userId) {
    candidates.push(`//cloudidentity.googleapis.com/users/${userId}`);
  }

  if (candidates.length === 0) {
    throw new Error(
      'Google Workspace Events API error: No valid targetResource candidate (missing user ID / space ID)'
    );
  }

  for (const targetResource of candidates) {
    const workspaceBody = {
      targetResource,
      eventTypes: VALID_MEET_EVENT_TYPES,
      notificationEndpoint: {
        pubsubTopic: PUB_SUB_TOPIC,
      },
    };

    const res = await fetch('https://workspaceevents.googleapis.com/v1/subscriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workspaceBody),
    });

    if (res.ok) {
      const data = await res.json();
      const subscriptionId = data.name || data.id || null;

      if (!subscriptionId) {
        throw new Error('Google Workspace Events API returned invalid subscription object');
      }

      const expiresAt = data.expireTime
        ? new Date(data.expireTime)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await prisma.organizationSettings.update({
        where: { organizationId },
        data: {
          googleSubscriptionId: subscriptionId,
          googleSubscriptionExpiresAt: expiresAt,
        },
      });

      // Only log if subscriptions.create() succeeded and returned a valid subscription object
      console.log(`[Google Meet Events] Subscription created`);
      return { success: true, subscriptionId };
    }

    // Handle 409: subscription already exists — save existing ID from error body
    if (res.status === 409) {
      let errBody: any = {};
      try {
        errBody = await res.json();
      } catch {}

      const existingId =
        errBody?.error?.details?.find((d: any) => d.metadata?.current_subscription)
          ?.metadata?.current_subscription ?? null;

      if (existingId) {
        console.log(`[Google Meet Events] Subscription already exists: ${existingId} — saving to DB`);
        await prisma.organizationSettings.update({
          where: { organizationId },
          data: {
            googleSubscriptionId: existingId,
            googleSubscriptionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        return { success: true, subscriptionId: existingId };
      }

      // No ID extractable from 409 — skip to next candidate
      console.warn(`[Google Meet Subscription Notice]: Subscription already exists for ${targetResource} but could not extract existing ID`);
      continue;
    }

    // All other errors — log and try next candidate
    const errText = await res.text();
    console.warn(`[Google Meet Subscription Notice]: Google Workspace Events API error (${res.status}): ${errText}`);
  }

  throw new Error('Failed to create Google Workspace Events subscription: all candidates exhausted');
}

/**
 * Renews an existing Google Workspace subscription using PATCH (extend TTL).
 * Falls back to re-create if no subscription ID is stored.
 */
export async function renewGoogleMeetWorkspaceSubscription(organizationId: string) {
  try {
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { googleRefreshToken: true, googleSubscriptionId: true, googleSubscriptionExpiresAt: true },
    });

    if (!settings?.googleRefreshToken) return;

    // If a subscription ID is already saved, try to PATCH (renew TTL) it first
    if (settings.googleSubscriptionId) {
      const accessToken = await getAccessTokenFromRefresh(settings.googleRefreshToken);
      const patchRes = await fetch(
        `https://workspaceevents.googleapis.com/v1/${settings.googleSubscriptionId}?updateMask=ttl`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          // Request maximum allowed TTL (7 days in seconds)
          body: JSON.stringify({ ttl: { seconds: 604800 } }),
        }
      );

      if (patchRes.ok) {
        const data = await patchRes.json();
        const expiresAt = data.expireTime
          ? new Date(data.expireTime)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await prisma.organizationSettings.update({
          where: { organizationId },
          data: { googleSubscriptionExpiresAt: expiresAt },
        });
        console.log(`[Google Meet Events] Subscription renewed via PATCH: ${settings.googleSubscriptionId}`);
        return;
      }

      const errText = await patchRes.text();
      console.warn(`[Google Meet Events] PATCH renewal failed (${patchRes.status}): ${errText} — will attempt re-create`);
    }

    // Fall back to re-creating the subscription
    console.log(`[Google Meet Events] Re-creating subscription for org ${organizationId}...`);
    await createGoogleMeetWorkspaceSubscription(organizationId, settings.googleRefreshToken);
  } catch (error: any) {
    console.error('[Google Meet Events] Renew subscription error:', error.message);
  }
}

/**
 * Deletes subscription when Google account is disconnected
 */
export async function deleteGoogleMeetWorkspaceSubscription(organizationId: string) {
  try {
    const settings = await prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { googleRefreshToken: true, googleSubscriptionId: true },
    });

    if (!settings?.googleSubscriptionId || !settings?.googleRefreshToken) return;

    const accessToken = await getAccessTokenFromRefresh(settings.googleRefreshToken);

    const res = await fetch(
      `https://workspaceevents.googleapis.com/v1/${settings.googleSubscriptionId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Google Meet Events] Delete subscription notice (${res.status}): ${errText}`);
    }

    await prisma.organizationSettings.update({
      where: { organizationId },
      data: {
        googleSubscriptionId: null,
        googleSubscriptionExpiresAt: null,
      },
    });

    console.log(`[Google Meet Events] Deleted subscription ${settings.googleSubscriptionId}`);
  } catch (error: any) {
    console.error('[Google Meet Events] Delete subscription error:', error);
  }
}
