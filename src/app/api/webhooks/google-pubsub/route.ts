import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAccessTokenFromRefresh } from '@/lib/google/calendar';
import { fetchMeetParticipantsAndTranscript } from '@/lib/google/meet';

/**
 * Resolve a conferenceRecord name to a meeting space details via Google Meet REST API.
 * e.g. "conferenceRecords/IIXrtt..." → { spaceId: "PgxdeDWij2kB", meetingUri: "https://meet.google.com/pgx-dedw-ij2b", meetingCode: "pgx-dedw-ij2b" }
 */
async function resolveMeetingCodeFromConferenceRecord(
  conferenceRecordName: string,
  accessToken: string
): Promise<{ spaceId: string; meetingUri: string | null; meetingCode: string | null } | null> {
  try {
    // Step 1: Get conference record → space resource name
    const recordRes = await fetch(
      `https://meet.googleapis.com/v2/${conferenceRecordName}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!recordRes.ok) {
      const err = await recordRes.text();
      console.warn(`[Google Meet Webhook] Conference record lookup failed (${recordRes.status}):`, err);
      return null;
    }

    const record = await recordRes.json();
    console.log(`[Google Meet Webhook] Conference record resolved:`, JSON.stringify(record, null, 2));

    // record.space = "spaces/PgxdeDWij2kB"
    const spaceName: string = record.space || '';
    if (!spaceName) return null;

    const spaceId = spaceName.replace(/^spaces\//, '');

    // Step 2: Get space details → meetingUri and meetingCode
    const spaceRes = await fetch(
      `https://meet.googleapis.com/v2/spaces/${spaceId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!spaceRes.ok) {
      const err = await spaceRes.text();
      console.warn(`[Google Meet Webhook] Space lookup failed (${spaceRes.status}):`, err);
      // Return just the spaceId as fallback
      return { spaceId, meetingUri: null, meetingCode: null };
    }

    const space = await spaceRes.json();
    console.log(`[Google Meet Webhook] Space resolved:`, JSON.stringify(space, null, 2));

    const meetingUri: string | null = space.meetingUri || space.meetingUrl || null;
    const meetingCode: string | null = space.meetingCode || null;

    return { spaceId, meetingUri, meetingCode };
  } catch (err: any) {
    console.error(`[Google Meet Webhook] Conference record lookup exception:`, err.message);
    return null;
  }
}

/**
 * Google Cloud Pub/Sub Webhook Handler for Google Meet Events
 * Topic: projects/email-syncing-472610/topics/omniwork-meet-events
 * Subscription: projects/email-syncing-472610/subscriptions/omniwork-meet-events-sub
 */
export async function POST(req: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log(`\n==================================================`);
  console.log(`[Google Meet Webhook] Request received at ${timestamp}`);

  try {
    let rawText = '';
    let body: any = {};

    try {
      rawText = await req.text();
      body = rawText ? JSON.parse(rawText) : {};
    } catch (parseErr: any) {
      console.warn(`[Google Meet Webhook] Request body parse notice: ${parseErr.message}`);
      body = {};
    }

    const subscriptionName =
      body?.subscription ||
      'projects/email-syncing-472610/subscriptions/omniwork-meet-events-sub';

    console.log(`[Google Meet Webhook] Subscription: ${subscriptionName}`);
    console.log(`[Google Meet Webhook] Raw Payload Body:`, JSON.stringify(body, null, 2));

    // Pub/Sub wraps the message payload in message.data (Base64 encoded)
    if (!body?.message?.data) {
      console.log(`[Google Meet Webhook] No Base64 message.data payload found in request.`);
      console.log(`==================================================\n`);
      return NextResponse.json(
        { message: 'No Pub/Sub message data found', status: 'acknowledged' },
        { status: 200 }
      );
    }

    // Decode Base64 message payload
    let decodedString = '';
    try {
      decodedString = Buffer.from(body.message.data, 'base64').toString('utf-8');
      console.log(`[Google Meet Webhook] Decoded Base64 Message:`, decodedString);
    } catch (decodeErr: any) {
      console.error(`[Google Meet Webhook] Base64 decoding failed:`, decodeErr);
      decodedString = '';
    }

    let eventData: any = {};
    if (decodedString) {
      try {
        eventData = JSON.parse(decodedString);
      } catch {
        eventData = { raw: decodedString };
      }
    }

    const eventType =
      body?.message?.attributes?.['ce-type'] ||
      body?.message?.attributes?.eventType ||
      eventData?.eventType ||
      'conference.ended';

    // Extract conference record name from the new Google Meet Event payload format
    // Payload: { conferenceRecord: { name: "conferenceRecords/IIXrtt..." } }
    const conferenceRecordName: string | null =
      eventData?.conferenceRecord?.name || null;

    // Directly provided meeting codes (legacy / curl test format)
    let meetingCode: string | undefined =
      eventData?.meetingCode ||
      eventData?.conference?.meetingCode ||
      eventData?.meetingUri ||
      eventData?.meetingLink;

    const googleEventId: string | undefined =
      eventData?.googleEventId || eventData?.eventId;

    // Extra identifiers resolved from Google Meet Spaces API
    let resolvedMeetingUri: string | null = null;
    let resolvedMeetingCode: string | null = null;
    let resolvedSpaceId: string | null = null;

    console.log(`[Google Meet Events] Conference ended received:`, {
      eventType,
      conferenceRecordName,
      meetingCode,
      googleEventId,
      fullEventData: eventData,
    });

    // --- Resolve conferenceRecord → space + meetingUri via Google Meet REST API ---
    // Fetch any org with a google refresh token to use as credentials (needed for both resolution and participant fetch)
    let orgSettings: { googleRefreshToken: string; organizationId: string } | null = null;

    if (conferenceRecordName) {
      orgSettings = await prisma.organizationSettings.findFirst({
        where: { googleRefreshToken: { not: null } },
        select: { googleRefreshToken: true, organizationId: true },
      }) as { googleRefreshToken: string; organizationId: string } | null;
    }

    if (!meetingCode && !googleEventId && conferenceRecordName) {
      console.log(`[Google Meet Webhook] Resolving conference record: ${conferenceRecordName}`);

      if (orgSettings?.googleRefreshToken) {
        try {
          const accessToken = await getAccessTokenFromRefresh(orgSettings.googleRefreshToken);
          const resolved = await resolveMeetingCodeFromConferenceRecord(
            conferenceRecordName,
            accessToken
          );
          if (resolved) {
            resolvedSpaceId = resolved.spaceId;
            resolvedMeetingUri = resolved.meetingUri;
            resolvedMeetingCode = resolved.meetingCode;
            console.log(`[Google Meet Webhook] Resolved:`, {
              spaceId: resolvedSpaceId,
              meetingUri: resolvedMeetingUri,
              meetingCode: resolvedMeetingCode,
            });
          }
        } catch (tokenErr: any) {
          console.warn(`[Google Meet Webhook] Could not get access token:`, tokenErr.message);
        }
      } else {
        console.warn(`[Google Meet Webhook] No org with Google credentials found to resolve conference record.`);
      }
    }

    // --- Match meeting in DB using all available identifiers ---
    let meeting = null;

    const orClauses: any[] = [];
    if (googleEventId) orClauses.push({ googleEventId });
    if (meetingCode) {
      orClauses.push({ meetLink: { contains: meetingCode } });
      orClauses.push({ meetLink: meetingCode });
    }
    if (resolvedMeetingUri) {
      orClauses.push({ meetLink: { contains: resolvedMeetingUri } });
      orClauses.push({ meetLink: resolvedMeetingUri });
    }
    if (resolvedMeetingCode) {
      orClauses.push({ meetLink: { contains: resolvedMeetingCode } });
    }
    if (resolvedSpaceId) {
      orClauses.push({ meetLink: { contains: resolvedSpaceId } });
    }

    if (orClauses.length > 0) {
      meeting = await prisma.meeting.findFirst({
        where: { OR: orClauses },
      });
    }

    if (meeting) {
      console.log(`[Google Meet Webhook] MATCH FOUND! Meeting ID: ${meeting.id} (${meeting.leadName || 'Meeting'})`);

      // Auto-complete the meeting in real-time
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'COMPLETED' },
      });

      // Update associated PlannerEvent reminders to DONE
      await prisma.plannerEvent.updateMany({
        where: {
          organizationId: meeting.organizationId,
          type: 'MEETING',
          startDate: meeting.startTime,
        },
        data: { status: 'DONE' },
      });

      console.log(
        `[Google Meet Webhook] SUCCESS: Meeting ${meeting.id} set to COMPLETED & PlannerEvent set to DONE.`
      );

      // --- Auto-fetch participants & transcript from Google Meet API ---
      if (conferenceRecordName && orgSettings?.googleRefreshToken) {
        console.log(`[Google Meet Webhook] Fetching participants & transcript for ${conferenceRecordName}...`);
        try {
          const accessToken = await getAccessTokenFromRefresh(orgSettings.googleRefreshToken);
          const { participants, transcript } = await fetchMeetParticipantsAndTranscript({
            conferenceRecordName,
            accessToken,
          });

          console.log(`[Google Meet Webhook] Fetched ${participants.length} participants, transcript: ${transcript ? 'YES' : 'NONE'}`);

          // Upsert MeetingNote with participants and raw transcript
          await prisma.meetingNote.upsert({
            where: { meetingId: meeting.id },
            create: {
              meetingId: meeting.id,
              participants: participants.length > 0 ? (participants as any) : undefined,
              rawTranscript: transcript ?? undefined,
              transcriptStatus: transcript ? 'PENDING' : 'UNAVAILABLE',
            },
            update: {
              participants: participants.length > 0 ? (participants as any) : undefined,
              rawTranscript: transcript ?? undefined,
              transcriptStatus: transcript ? 'PENDING' : 'UNAVAILABLE',
            },
          });

          console.log(`[Google Meet Webhook] Participants & transcript saved to DB.`);
        } catch (fetchErr: any) {
          console.warn(`[Google Meet Webhook] Could not fetch participants/transcript:`, fetchErr.message);
        }
      }
    } else {
      console.warn(
        `[Google Meet Webhook] NO MATCH: No meeting found. Tried: spaceId='${resolvedSpaceId}', meetingUri='${resolvedMeetingUri}', meetingCode='${resolvedMeetingCode}', directCode='${meetingCode}', eventId='${googleEventId}'.`
      );
    }

    console.log(`==================================================\n`);
    return NextResponse.json({ success: true, processed: !!meeting }, { status: 200 });
  } catch (error: any) {
    console.error('[Google Meet Webhook Exception]:', error);
    console.log(`==================================================\n`);
    return NextResponse.json(
      { error: error.message || 'Pub/Sub handler error' },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      status: 'Operational',
      topic: 'projects/email-syncing-472610/topics/omniwork-meet-events',
      subscription:
        'projects/email-syncing-472610/subscriptions/omniwork-meet-events-sub',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
