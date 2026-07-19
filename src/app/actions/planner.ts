'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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
      },
    });

    revalidatePath('/workspace/planner/events');
    return { success: true, event };
  } catch (error: any) {
    return { error: error.message || 'Failed to create event.' };
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
