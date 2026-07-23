import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Real-Time Google Calendar & Google Meet Webhook Endpoint
 * Handles x-goog-resource-state notifications when meetings end or events update in real time.
 */
export async function POST(req: NextRequest) {
  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceId = req.headers.get('x-goog-resource-id');
    const resourceState = req.headers.get('x-goog-resource-state'); // e.g. 'sync', 'exists', 'conference.ended'

    // 1. Initial Google Webhook Verification Sync
    if (resourceState === 'sync') {
      return NextResponse.json({ success: true, message: 'Google webhook channel verified' }, { status: 200 });
    }

    // Read payload if present
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body may be empty in standard headers-only Google Calendar push notifications
    }

    const eventId = body?.eventId || body?.event?.id || req.headers.get('x-goog-event-id');
    const meetLink = body?.meetLink || body?.conferenceData?.entryPoints?.[0]?.uri;

    // Search matching meeting by googleEventId or meetLink
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          ...(eventId ? [{ googleEventId: eventId }] : []),
          ...(meetLink ? [{ meetLink: meetLink }] : []),
        ],
      },
    });

    if (meeting) {
      // Real-time auto-completion: Mark meeting as COMPLETED
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

      console.log(`[Google Webhook] Real-time completed meeting ${meeting.id} (${meeting.leadName})`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Google Webhook Route Error]:', error);
    return NextResponse.json({ error: error.message || 'Webhook handler error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Google Webhook Endpoint Operational' }, { status: 200 });
}
