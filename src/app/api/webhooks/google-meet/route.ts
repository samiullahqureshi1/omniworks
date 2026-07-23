import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Real-Time Google Meet Audit Webhook Endpoint
 * Triggers instantly when conference.ended is pushed by Google Meet when all participants leave.
 */
export async function POST(req: NextRequest) {
  try {
    const resourceState = req.headers.get('x-goog-resource-state');

    if (resourceState === 'sync') {
      return NextResponse.json({ success: true, message: 'Google Meet Webhook verified' }, { status: 200 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body empty fallback
    }

    const meetingCode = body?.meetingCode || body?.conference?.meetingCode;
    const meetUri = body?.meetingUri || body?.conferenceData?.entryPoints?.[0]?.uri;

    // Search matching meeting
    const meeting = await prisma.meeting.findFirst({
      where: {
        OR: [
          ...(meetUri ? [{ meetLink: meetUri }] : []),
          ...(meetingCode ? [{ meetLink: { contains: meetingCode } }] : []),
        ],
      },
    });

    if (meeting) {
      // Real-Time Auto-Completion when meeting conference ends
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'COMPLETED' },
      });

      await prisma.plannerEvent.updateMany({
        where: {
          organizationId: meeting.organizationId,
          type: 'MEETING',
          startDate: meeting.startTime,
        },
        data: { status: 'DONE' },
      });

      console.log(`[Google Meet Webhook] Auto-completed conference for meeting ${meeting.id}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[Google Meet Webhook Error]:', error);
    return NextResponse.json({ error: error.message || 'Webhook error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Google Meet Real-Time Webhook Active' }, { status: 200 });
}
