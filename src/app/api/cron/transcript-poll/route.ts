import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processMeetingTranscript } from '@/lib/meetings/transcript';

export const dynamic = 'force-dynamic';

const DEFAULT_GIVEUP_MINUTES = 120; // stop polling & mark UNAVAILABLE after this
const LOOKBACK_HOURS = 24; // don't scan meetings older than this

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const giveUpMinutes = Number(process.env.TRANSCRIPT_GIVEUP_MINUTES) || DEFAULT_GIVEUP_MINUTES;
  const now = new Date();
  const lookback = new Date(now.getTime() - LOOKBACK_HOURS * 60 * 60 * 1000);
  const giveUpBefore = new Date(now.getTime() - giveUpMinutes * 60 * 1000);

  // Ended meetings that haven't reached a terminal transcript state yet.
  //
  // COMPLETED is included deliberately: the meetings page auto-flips SCHEDULED →
  // COMPLETED once the end time passes, so a previous version of this query (which
  // only matched SCHEDULED) skipped every meeting the user had already looked at —
  // meaning their transcript was never fetched.
  const meetings = await prisma.meeting.findMany({
    where: {
      status: { in: ['SCHEDULED', 'COMPLETED'] },
      endTime: { lt: now, gt: lookback },
      OR: [{ note: { is: null } }, { note: { transcriptStatus: 'PENDING' } }],
    },
    select: { id: true, endTime: true },
    take: 25,
  });

  const outcomes: Array<{ meetingId: string; status: string; error?: string }> = [];

  for (const m of meetings) {
    const { outcome, error } = await processMeetingTranscript(m.id);

    if (outcome === 'analyzed' || outcome === 'saved_only') {
      await prisma.meeting.update({ where: { id: m.id }, data: { status: 'COMPLETED' } });
      outcomes.push({ meetingId: m.id, status: outcome, ...(error ? { error } : {}) });
      continue;
    }

    // Nothing available yet: give up once the window has elapsed.
    if (m.endTime < giveUpBefore) {
      await prisma.meetingNote.update({
        where: { meetingId: m.id },
        data: { transcriptStatus: 'UNAVAILABLE' },
      }).catch(() => {});
      await prisma.meeting.update({ where: { id: m.id }, data: { status: 'COMPLETED' } });
      outcomes.push({ meetingId: m.id, status: 'unavailable', ...(error ? { error } : {}) });
    } else {
      outcomes.push({ meetingId: m.id, status: outcome, ...(error ? { error } : {}) });
    }
  }

  return NextResponse.json({ success: true, checked: meetings.length, outcomes });
}
