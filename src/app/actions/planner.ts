'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createCalendarMeetEvent } from '@/lib/google/calendar';
import { renewGoogleMeetWorkspaceSubscription } from '@/lib/google/workspaceEvents';

/**
 * Planner data — role-scoped views over meetings, events, tasks.
 * Visibility rules (per spec):
 *   Owner  — everything in the org
 *   PM     — their projects' meetings/tasks
 *   Member — meetings they host + tasks assigned to them
 *   Client — their project's meetings + client_visible events only
 */

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export async function getPlannerMeetingsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { userId, organizationId, role } = session;

    let where: any = { organizationId };
    if (role === 'CLIENT') {
      where = {
        organizationId,
        OR: [{ clientId: userId }, { project: { clientId: userId } }],
      };
    } else if (role === 'MEMBER') {
      where = {
        organizationId,
        OR: [{ pmId: userId }, { project: { projectManagerId: userId } }],
      };
    }
    // OWNER: all org meetings.

    // Auto-update past SCHEDULED meetings to COMPLETED if endTime has passed
    const now = new Date();
    await prisma.meeting.updateMany({
      where: {
        organizationId,
        status: 'SCHEDULED',
        endTime: { lt: now },
      },
      data: {
        status: 'COMPLETED',
      },
    });

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        note: true,
        pm: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    return { success: true, meetings, role };
  } catch (error: any) {
    return { error: error.message || 'Failed to load meetings.' };
  }
}

import { sendMail } from '@/lib/mailer';

export interface CreateScheduledMeetingInput {
  title?: string;
  startTime: string;
  endTime: string;
  meetingType?: 'INTERNAL' | 'EXTERNAL';
  projectId?: string | null;
  clientId?: string | null;
  leadName?: string | null;
  leadEmail?: string | null;
  leadCompany?: string | null;
  leadNote?: string | null;
  meetLink?: string | null;
  assignedMemberIds?: string[];
}

export async function createScheduledMeetingAction(input: CreateScheduledMeetingInput) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    if (!input.startTime || !input.endTime) {
      return { error: 'Start date/time and end date/time are required.' };
    }

    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    // INTERNAL = Client existing in Portal. EXTERNAL = Guest/Lead not in Portal.
    const isPortalClient = input.meetingType === 'INTERNAL';

    let targetProjectId = input.projectId || null;
    let targetClientId = input.clientId || null;
    let recipientEmail = input.leadEmail?.trim() || null;
    let projectName = '';

    // If a project is selected (Internal Portal Client flow)
    if (targetProjectId) {
      const proj = await prisma.project.findUnique({
        where: { id: targetProjectId },
        include: { client: true },
      });

      if (proj) {
        projectName = proj.name;
        if (proj.clientId && !targetClientId) {
          targetClientId = proj.clientId;
        }
        if (proj.client?.email && !recipientEmail) {
          recipientEmail = proj.client.email;
        }
        if (proj.client?.name && !input.leadName) {
          input.leadName = proj.client.name;
        }
      }
    }

    // Generate unique fallback room code
    const randomCode = `${Math.random().toString(36).slice(2, 5)}-${Math.random().toString(36).slice(2, 6)}-${Math.random().toString(36).slice(2, 5)}`;
    let finalMeetLink = input.meetLink?.trim() || `https://meet.google.com/${randomCode}`;
    let googleEventId: string | null = null;

    // Check if Organization has Google Calendar connected
    try {
      const orgSettings = await prisma.organizationSettings.findUnique({
        where: { organizationId: session.organizationId },
      });

      if (orgSettings?.googleRefreshToken) {
        const attendeeEmails: string[] = [];
        if (recipientEmail) {
          attendeeEmails.push(recipientEmail);
        }

        const googleRes = await createCalendarMeetEvent({
          refreshToken: orgSettings.googleRefreshToken,
          summary: input.title?.trim() || `Meeting: ${input.leadName?.trim() || 'Scheduled Call'}`,
          description: input.leadNote?.trim() || 'Scheduled via OmniWork Workspace',
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          timezone: orgSettings.timezone || 'UTC',
          attendeeEmails,
        });

        if (googleRes.meetLink) {
          finalMeetLink = googleRes.meetLink;
        }
        if (googleRes.eventId) {
          googleEventId = googleRes.eventId;
        }

        // Auto-renew Google Meet Workspace Event subscription
        renewGoogleMeetWorkspaceSubscription(session.organizationId).catch(console.error);
      }
    } catch (err) {
      console.warn('[createScheduledMeetingAction] Google Calendar sync notice:', err);
    }

    const meeting = await prisma.meeting.create({
      data: {
        organizationId: session.organizationId,
        pmId: session.userId,
        projectId: targetProjectId,
        clientId: targetClientId,
        leadName: input.leadName?.trim() || input.title?.trim() || 'Scheduled Meeting',
        leadEmail: recipientEmail,
        leadCompany: input.leadCompany?.trim() || null,
        leadNote: input.leadNote?.trim() || null,
        startTime: start,
        endTime: end,
        status: 'SCHEDULED',
        meetLink: finalMeetLink,
        googleEventId,
      },
    });

    // Create PlannerEvent reminders for assigned members / host
    // Set visibility to CLIENT_VISIBLE if it's a Portal Client meeting so it appears in Client Portal & Client Reminders!
    const memberIdsToAssign = new Set<string>();
    memberIdsToAssign.add(session.userId);
    if (Array.isArray(input.assignedMemberIds)) {
      input.assignedMemberIds.forEach(id => {
        if (id) memberIdsToAssign.add(id);
      });
    }

    for (const memberId of Array.from(memberIdsToAssign)) {
      await prisma.plannerEvent.create({
        data: {
          organizationId: session.organizationId,
          title: input.title?.trim() || `Meeting: ${input.leadName?.trim() || 'Scheduled Call'}`,
          type: 'MEETING',
          startDate: start,
          endDate: end,
          projectId: targetProjectId,
          assignedToId: memberId,
          visibility: isPortalClient ? 'CLIENT_VISIBLE' : 'INTERNAL',
          status: 'OPEN',
        },
      });
    }

    // Send email notification with Google Meet link to client or guest
    if (recipientEmail) {
      await sendMail({
        to: recipientEmail,
        subject: `Meeting Scheduled: ${input.title?.trim() || 'Scheduled Meeting'}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Meeting Scheduled</h2>
            <p style="font-size: 14px; color: #475569;">Hello ${input.leadName?.trim() || 'Participant'},</p>
            <p style="font-size: 14px; color: #475569;">
              A new meeting has been scheduled ${projectName ? `for project <strong>${projectName}</strong>` : 'with OmniWork Workspace'}.
            </p>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Title:</strong> ${input.title?.trim() || 'Meeting'}</p>
              <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>Date & Time:</strong> ${start.toLocaleString()}</p>
              <p style="margin: 0; font-size: 14px;"><strong>Join Meeting Link:</strong> <a href="${finalMeetLink}" style="color: #0284c7; font-weight: 600; text-decoration: underline;">${finalMeetLink}</a></p>
              ${input.leadNote?.trim() ? `<p style="margin: 8px 0 0 0; font-size: 14px;"><strong>Agenda:</strong> ${input.leadNote.trim()}</p>` : ''}
            </div>

            ${isPortalClient ? '<p style="font-size: 13px; color: #64748b;">This meeting is also saved in your Client Portal and Client Reminders.</p>' : ''}
          </div>
        `,
      });
    }

    revalidatePath('/workspace/planner/meetings');
    revalidatePath('/workspace/planner/reminders');
    revalidatePath('/workspace/planner/events');

    return { success: true, meeting };
  } catch (error: any) {
    console.error('[createScheduledMeetingAction] Error:', error);
    return { error: error.message || 'Failed to schedule meeting.' };
  }
}

/**
 * Reschedule a meeting to a new start and end time.
 */
export async function rescheduleMeetingAction(
  meetingId: string,
  startTimeIso: string,
  endTimeIso: string,
  reason?: string
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const start = new Date(startTimeIso);
    const end = new Date(endTimeIso);

    const existing = await prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: session.organizationId },
    });

    if (!existing) return { error: 'Meeting not found.' };

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        startTime: start,
        endTime: end,
        status: 'RESCHEDULED',
        rescheduleReason: reason?.trim() || null,
      },
    });

    revalidatePath('/workspace/planner/meetings');
    revalidatePath('/workspace/planner/reminders');
    revalidatePath('/workspace/planner/events');

    return { success: true, meeting: updated };
  } catch (error: any) {
    console.error('[rescheduleMeetingAction] Error:', error);
    return { error: error.message || 'Failed to reschedule meeting.' };
  }
}

/**
 * Postpone a meeting with a reason and remove from Reminders.
 */
export async function postponeMeetingAction(meetingId: string, reason?: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const existing = await prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: session.organizationId },
    });

    if (!existing) return { error: 'Meeting not found.' };

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'POSTPONED',
        postponeReason: reason?.trim() || 'No reason provided',
      },
    });

    // Clean up / remove corresponding PlannerEvent reminders so it vanishes from Reminders!
    await prisma.plannerEvent.deleteMany({
      where: {
        organizationId: session.organizationId,
        type: 'MEETING',
        startDate: existing.startTime,
      },
    });

    revalidatePath('/workspace/planner/meetings');
    revalidatePath('/workspace/planner/reminders');
    revalidatePath('/workspace/planner/events');

    return { success: true, meeting: updated };
  } catch (error: any) {
    console.error('[postponeMeetingAction] Error:', error);
    return { error: error.message || 'Failed to postpone meeting.' };
  }
}

/**
 * Mark a meeting as COMPLETED directly (instant manual completion without timer).
 */
export async function completeMeetingAction(meetingId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const existing = await prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: session.organizationId },
    });

    if (!existing) return { error: 'Meeting not found.' };

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: 'COMPLETED',
      },
    });

    // Mark matching PlannerEvent reminders as DONE
    await prisma.plannerEvent.updateMany({
      where: {
        organizationId: session.organizationId,
        type: 'MEETING',
        startDate: existing.startTime,
      },
      data: {
        status: 'DONE',
      },
    });

    revalidatePath('/workspace/planner/meetings');
    revalidatePath('/workspace/planner/reminders');
    revalidatePath('/workspace/planner/events');

    return { success: true, meeting: updated };
  } catch (error: any) {
    console.error('[completeMeetingAction] Error:', error);
    return { error: error.message || 'Failed to complete meeting.' };
  }
}

/**
 * Delete a meeting permanently and remove from Reminders.
 */
export async function deleteMeetingAction(meetingId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const existing = await prisma.meeting.findFirst({
      where: { id: meetingId, organizationId: session.organizationId },
    });

    if (existing) {
      // Remove corresponding PlannerEvent reminders
      await prisma.plannerEvent.deleteMany({
        where: {
          organizationId: session.organizationId,
          type: 'MEETING',
          startDate: existing.startTime,
        },
      });

      await prisma.meeting.delete({
        where: { id: meetingId },
      });
    }

    revalidatePath('/workspace/planner/meetings');
    revalidatePath('/workspace/planner/reminders');
    revalidatePath('/workspace/planner/events');

    return { success: true };
  } catch (error: any) {
    console.error('[deleteMeetingAction] Error:', error);
    return { error: error.message || 'Failed to delete meeting.' };
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function getPlannerEventsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    const { userId, organizationId, role } = session;

    let where: any = { organizationId };
    if (role === 'CLIENT') {
      where = {
        organizationId,
        visibility: 'CLIENT_VISIBLE',
        OR: [{ projectId: null }, { project: { clientId: userId } }],
      };
    }

    const events = await prisma.plannerEvent.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'asc' },
    });

    return { success: true, events, canManage: role === 'OWNER' || role === 'MEMBER' };
  } catch (error: any) {
    return { error: error.message || 'Failed to load events.' };
  }
}

export interface PlannerEventInput {
  title: string;
  type: 'TASK' | 'MILESTONE' | 'MEETING';
  startDate: string;
  endDate?: string | null;
  projectId?: string | null;
  assignedToId?: string | null;
  visibility: 'INTERNAL' | 'CLIENT_VISIBLE';
  status?: string;
  isRepeated?: boolean;
  repeatFrequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | null;
  repeatEndsAt?: string | null;
}

export async function createPlannerEventAction(input: PlannerEventInput) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role === 'CLIENT') return { error: 'Clients cannot create events.' };
    if (!input.title?.trim()) return { error: 'A title is required.' };
    if (!input.startDate) return { error: 'A start date is required.' };

    const event = await prisma.plannerEvent.create({
      data: {
        organizationId: session.organizationId,
        title: input.title.trim(),
        type: input.type,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
        projectId: input.projectId || null,
        assignedToId: input.assignedToId || null,
        visibility: input.visibility,
        status: input.status || 'OPEN',
        isRepeated: input.isRepeated || false,
        repeatFrequency: input.repeatFrequency || null,
        repeatEndsAt: input.repeatEndsAt ? new Date(input.repeatEndsAt) : null,
      },
    });

    revalidatePath('/workspace/planner/events');
    return { success: true, event };
  } catch (error: any) {
    return { error: error.message || 'Failed to create event.' };
  }
}

/**
 * Advance recurring events: called on page load.
 * For any recurring event whose startDate is in the past and has no future child,
 * it creates the next occurrence automatically.
 */
export async function processRecurringEventsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const now = new Date();
    const recurringEvents = await prisma.plannerEvent.findMany({
      where: {
        organizationId: session.organizationId,
        isRepeated: true,
        parentEventId: null, // only root events
        startDate: { lt: now },
      },
    });

    for (const ev of recurringEvents) {
      if (!ev.repeatFrequency) continue;
      // Check if ends at is passed
      if (ev.repeatEndsAt && ev.repeatEndsAt < now) continue;

      // Check if a future child already exists
      const futureChild = await prisma.plannerEvent.findFirst({
        where: { parentEventId: ev.id, startDate: { gte: now } },
      });
      if (futureChild) continue;

      // Calculate next date
      const nextStart = new Date(ev.startDate);
      if (ev.repeatFrequency === 'DAILY') nextStart.setDate(nextStart.getDate() + 1);
      else if (ev.repeatFrequency === 'WEEKLY') nextStart.setDate(nextStart.getDate() + 7);
      else if (ev.repeatFrequency === 'MONTHLY') nextStart.setMonth(nextStart.getMonth() + 1);
      else if (ev.repeatFrequency === 'YEARLY') nextStart.setFullYear(nextStart.getFullYear() + 1);

      // Advance until next date is in the future
      while (nextStart <= now) {
        if (ev.repeatFrequency === 'DAILY') nextStart.setDate(nextStart.getDate() + 1);
        else if (ev.repeatFrequency === 'WEEKLY') nextStart.setDate(nextStart.getDate() + 7);
        else if (ev.repeatFrequency === 'MONTHLY') nextStart.setMonth(nextStart.getMonth() + 1);
        else if (ev.repeatFrequency === 'YEARLY') nextStart.setFullYear(nextStart.getFullYear() + 1);
      }

      if (ev.repeatEndsAt && nextStart > ev.repeatEndsAt) continue;

      await prisma.plannerEvent.create({
        data: {
          organizationId: ev.organizationId,
          title: ev.title,
          type: ev.type,
          startDate: nextStart,
          endDate: null,
          projectId: ev.projectId,
          assignedToId: ev.assignedToId,
          visibility: ev.visibility,
          status: 'OPEN',
          isRepeated: true,
          repeatFrequency: ev.repeatFrequency,
          repeatEndsAt: ev.repeatEndsAt,
          parentEventId: ev.id,
        },
      });
    }

    revalidatePath('/workspace/planner/events');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to process recurring events.' };
  }
}

export async function updatePlannerEventAction(id: string, input: Partial<PlannerEventInput>) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role === 'CLIENT') return { error: 'Clients cannot edit events.' };

    const existing = await prisma.plannerEvent.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!existing) return { error: 'Event not found.' };

    const event = await prisma.plannerEvent.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.startDate !== undefined ? { startDate: new Date(input.startDate) } : {}),
        ...(input.endDate !== undefined ? { endDate: input.endDate ? new Date(input.endDate) : null } : {}),
        ...(input.projectId !== undefined ? { projectId: input.projectId || null } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId || null } : {}),
        ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    revalidatePath('/workspace/planner/events');
    return { success: true, event };
  } catch (error: any) {
    return { error: error.message || 'Failed to update event.' };
  }
}

export async function deletePlannerEventAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role === 'CLIENT') return { error: 'Clients cannot delete events.' };

    const existing = await prisma.plannerEvent.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!existing) return { error: 'Event not found.' };

    await prisma.plannerEvent.delete({ where: { id } });
    revalidatePath('/workspace/planner/events');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete event.' };
  }
}

// ---------------------------------------------------------------------------
// My Calendar (tasks assigned to me + my meetings)
// ---------------------------------------------------------------------------

export type CalendarItem = {
  id: string;
  kind: 'task' | 'meeting' | 'project';
  title: string;
  date: string; // ISO
  end?: string | null;
  meta?: string | null;
  href?: string | null;
  status?: string | null;
  draggable?: boolean;
};

export async function getPlannerCalendarAction(fromIso: string, toIso: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role === 'CLIENT') return { error: 'Not available for clients.' };

    const { userId, organizationId, role } = session;
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const canReschedule = role === 'OWNER' || role === 'MEMBER';

    const [tasks, meetings, projects] = await Promise.all([
      prisma.task.findMany({
        where: {
          organizationId,
          dueDate: { gte: from, lte: to },
          assignees: { some: { userId } },
        },
        include: { project: { select: { id: true, name: true } }, status: true },
      }),
      prisma.meeting.findMany({
        where: {
          organizationId,
          startTime: { gte: from, lte: to },
          status: { notIn: ['COMPLETED', 'POSTPONED'] },
          OR: [{ pmId: userId }, { project: { projectManagerId: userId } }],
        },
        include: { project: { select: { id: true, name: true } } },
      }),
      // Projects the user manages or is assigned to, shown by their due (end) date.
      // Owners and Master Admins can see all organization projects on the calendar.
      prisma.project.findMany({
        where: {
          organizationId,
          endDate: { gte: from, lte: to },
          ...(role === 'OWNER' || role === 'MASTER_ADMIN'
            ? {}
            : {
                OR: [
                  { projectManagerId: userId },
                  { assignees: { some: { userId } } },
                ],
              }),
        },
        include: { status: true },
      }),
    ]);

    const items: CalendarItem[] = [
      ...tasks
        .filter((t) => t.dueDate)
        .map((t) => ({
          id: `task-${t.id}`,
          kind: 'task' as const,
          title: t.title,
          date: t.dueDate!.toISOString(),
          meta: t.project?.name || null,
          href: `/workspace/tasks?taskId=${t.id}`,
          status: t.status?.name || null,
          draggable: canReschedule,
        })),
      ...meetings.map((m) => ({
        id: `meeting-${m.id}`,
        kind: 'meeting' as const,
        title: m.project ? `Meeting — ${m.project.name}` : `Intro call${m.leadName ? ` · ${m.leadName}` : ''}`,
        date: m.startTime.toISOString(),
        end: m.endTime.toISOString(),
        meta: m.meetLink ? 'Google Meet' : null,
        href: '/workspace/planner/meetings',
        draggable: false,
      })),
      ...projects
        .filter((p) => p.endDate)
        .map((p) => ({
          id: `project-${p.id}`,
          kind: 'project' as const,
          title: p.name,
          date: p.endDate!.toISOString(),
          meta: 'Project due',
          href: `/workspace/projects/${p.id}`,
          status: p.status?.name || null,
          draggable: false,
        })),
    ];

    return { success: true, items, canReschedule };
  } catch (error: any) {
    return { error: error.message || 'Failed to load calendar.' };
  }
}

export async function rescheduleTaskAction(taskId: string, newDueDateIso: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role === 'CLIENT') return { error: 'Not allowed.' };

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
      select: { id: true, projectId: true, project: { select: { projectManagerId: true } } },
    });
    if (!task) return { error: 'Task not found.' };

    // Members may only reschedule tasks on projects they manage.
    if (session.role === 'MEMBER' && task.project?.projectManagerId !== session.userId) {
      return { error: 'Only the project manager can reschedule this task.' };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { dueDate: new Date(newDueDateIso) },
    });

    revalidatePath('/workspace/planner/calendar');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to reschedule task.' };
  }
}

// ---------------------------------------------------------------------------
// Reminders (upcoming deadlines + meetings for me)
// ---------------------------------------------------------------------------

export async function getRemindersAction(days = 14) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    const { userId, organizationId, role } = session;

    const now = new Date();
    const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const meetingWhere: any =
      role === 'CLIENT'
        ? { organizationId, startTime: { gte: now, lte: until }, OR: [{ clientId: userId }, { project: { clientId: userId } }] }
        : { organizationId, startTime: { gte: now, lte: until }, OR: [{ pmId: userId }, { project: { projectManagerId: userId } }] };

    const [tasks, meetings] = await Promise.all([
      role === 'CLIENT'
        ? Promise.resolve([] as any[])
        : prisma.task.findMany({
            where: {
              organizationId,
              dueDate: { gte: now, lte: until },
              assignees: { some: { userId } },
            },
            include: { project: { select: { id: true, name: true } }, status: true },
            orderBy: { dueDate: 'asc' },
          }),
      prisma.meeting.findMany({
        where: meetingWhere,
        include: { project: { select: { id: true, name: true } } },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const reminders = [
      ...tasks
        .filter((t: any) => t.dueDate && !/done|complete/i.test(t.status?.name || ''))
        .map((t: any) => ({
          id: `task-${t.id}`,
          kind: 'task' as const,
          title: t.title,
          date: t.dueDate.toISOString(),
          meta: t.project?.name || null,
          href: `/workspace/tasks?taskId=${t.id}`,
        })),
      ...meetings.map((m: any) => ({
        id: `meeting-${m.id}`,
        kind: 'meeting' as const,
        title: m.project ? `Meeting — ${m.project.name}` : `Intro call${m.leadName ? ` · ${m.leadName}` : ''}`,
        date: m.startTime.toISOString(),
        meta: m.meetLink ? 'Google Meet' : null,
        href: '/workspace/planner/meetings',
      })),
    ].sort((a, b) => a.date.localeCompare(b.date));

    return { success: true, reminders };
  } catch (error: any) {
    return { error: error.message || 'Failed to load reminders.' };
  }
}
