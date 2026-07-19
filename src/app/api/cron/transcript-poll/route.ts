import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { fetchMeetTranscriptText } from '@/lib/google/meet';
import { analyzeTranscript, geminiConfigured } from '@/lib/google/gemini';

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
  const meetings = await prisma.meeting.findMany({
    where: {
      status: 'SCHEDULED',
      endTime: { lt: now, gt: lookback },
      OR: [{ note: { is: null } }, { note: { transcriptStatus: 'PENDING' } }],
    },
    select: {
      id: true,
      organizationId: true,
      startTime: true,
      endTime: true,
      meetLink: true,
    },
    take: 25,
  });

  // Cache org refresh tokens for this run.
  const tokenCache = new Map<string, string | null>();
  async function orgToken(orgId: string): Promise<string | null> {
    if (tokenCache.has(orgId)) return tokenCache.get(orgId)!;
    const s = await prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: { googleRefreshToken: true },
    });
    const t = s?.googleRefreshToken || null;
    tokenCache.set(orgId, t);
    return t;
  }

  const outcomes: Array<{ meetingId: string; status: string }> = [];

  for (const m of meetings) {
    // Ensure a PENDING note row exists so this meeting is tracked.
    await prisma.meetingNote.upsert({
      where: { meetingId: m.id },
      create: { meetingId: m.id, transcriptStatus: 'PENDING' },
      update: {},
    });

    const refreshToken = await orgToken(m.organizationId);
    let transcript: string | null = null;
    if (refreshToken) {
      transcript = await fetchMeetTranscriptText({
        refreshToken,
        startTime: m.startTime,
        meetLink: m.meetLink,
      });
    }

    if (transcript && geminiConfigured()) {
      try {
        const analysis = await analyzeTranscript(transcript);
        await prisma.meetingNote.update({
          where: { meetingId: m.id },
          data: {
            summary: analysis.summary,
            keyPoints: analysis.key_points,
            actionItems: analysis.action_items as any,
            notes: analysis.notes,
            transcriptStatus: 'AVAILABLE',
          },
        });
        await prisma.meeting.update({ where: { id: m.id }, data: { status: 'COMPLETED' } });
        outcomes.push({ meetingId: m.id, status: 'analyzed' });
        continue;
      } catch (e: any) {
        console.error('[transcript-poll] analysis failed:', e?.message || e);
        // fall through — will retry next run (or give up below)
      }
    }

    // No transcript yet (or analysis failed): give up after the window.
    if (m.endTime < giveUpBefore) {
      await prisma.meetingNote.update({
        where: { meetingId: m.id },
        data: { transcriptStatus: 'UNAVAILABLE' },
      });
      await prisma.meeting.update({ where: { id: m.id }, data: { status: 'COMPLETED' } });
      outcomes.push({ meetingId: m.id, status: 'unavailable' });
    } else {
      outcomes.push({ meetingId: m.id, status: 'pending' });
    }
  }

  return NextResponse.json({ success: true, checked: meetings.length, outcomes });
}
