import { NextRequest, NextResponse } from 'next/server';
import { GET as runMeetingReminders } from '../meeting-reminders/route';
import { GET as runTranscriptPoll } from '../transcript-poll/route';

// Never cache; this is a scheduled runner.
export const dynamic = 'force-dynamic';

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, any> = {};

  try {
    const remindersRes = await runMeetingReminders(req);
    results.meetingReminders = await remindersRes.json();
  } catch (err: any) {
    results.meetingReminders = { error: err.message };
  }

  try {
    const transcriptRes = await runTranscriptPoll(req);
    results.transcriptPoll = await transcriptRes.json();
  } catch (err: any) {
    results.transcriptPoll = { error: err.message };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
