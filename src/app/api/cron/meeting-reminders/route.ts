import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { createNotification } from '@/app/actions/notifications';

// Never cache; this is a scheduled job.
export const dynamic = 'force-dynamic';

const DEFAULT_LEAD_MINUTES = 30;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // must be configured
  const header = req.headers.get('authorization');
  return header === `Bearer ${secret}`;
}

function formatWhen(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leadMinutes = Number(process.env.REMINDER_LEAD_MINUTES) || DEFAULT_LEAD_MINUTES;
  const now = new Date();
  const windowEnd = new Date(now.getTime() + leadMinutes * 60_000);

  const meetings = await prisma.meeting.findMany({
    where: {
      status: 'SCHEDULED',
      reminderSentAt: null,
      startTime: { gt: now, lte: windowEnd },
    },
    include: {
      pm: { select: { id: true, name: true, email: true } },
      client: { select: { name: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  // Cache org timezones for this run.
  const tzCache = new Map<string, string>();
  async function orgTimezone(orgId: string): Promise<string> {
    if (tzCache.has(orgId)) return tzCache.get(orgId)!;
    const s = await prisma.organizationSettings.findUnique({
      where: { organizationId: orgId },
      select: { timezone: true },
    });
    const tz = s?.timezone || 'UTC';
    tzCache.set(orgId, tz);
    return tz;
  }

  let sent = 0;
  const results: Array<{ meetingId: string; emailed: boolean }> = [];

  for (const m of meetings) {
    const tz = await orgTimezone(m.organizationId);
    const when = formatWhen(m.startTime, tz);
    const title = m.project ? `Meeting — ${m.project.name}` : `Intro call${m.leadName ? ` with ${m.leadName}` : ''}`;
    const guestEmail = m.client?.email || m.leadEmail || null;
    const guestName = m.client?.name || m.leadName || 'Guest';

    const meetLinkHtml = m.meetLink
      ? `<p>Join with Google Meet: <a href="${m.meetLink}">${m.meetLink}</a></p>`
      : `<p>Your host will share the meeting link shortly.</p>`;

    const html = `
      <div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a">
        <h2 style="margin:0 0 8px">Reminder: ${title}</h2>
        <p style="margin:0 0 4px"><strong>When:</strong> ${when}</p>
        ${meetLinkHtml}
        <p style="color:#64748b;margin-top:16px">This is an automated reminder from OmniWork.</p>
      </div>`;

    const recipients = [m.pm?.email, guestEmail].filter(Boolean) as string[];
    let emailed = false;
    if (recipients.length > 0) {
      emailed = await sendMail({ to: recipients, subject: `Reminder: ${title} — ${when}`, html });
    }

    // In-app notification (best-effort; won't block the reminder).
    try {
      await createNotification({
        organizationId: m.organizationId,
        projectId: m.projectId || undefined,
        actorId: m.pmId,
        type: 'meeting_reminder',
        title: `Upcoming: ${title}`,
        message: `Starts ${when}${guestEmail ? ` with ${guestName}` : ''}.`,
        actionUrl: '/workspace/planner/meetings',
        clientVisible: !!m.projectId,
      });
    } catch (e: any) {
      console.error('[reminders] notification failed:', e?.message || e);
    }

    await prisma.meeting.update({
      where: { id: m.id },
      data: { reminderSentAt: new Date() },
    });

    sent++;
    results.push({ meetingId: m.id, emailed });
  }

  return NextResponse.json({ success: true, checked: meetings.length, sent, leadMinutes, results });
}
