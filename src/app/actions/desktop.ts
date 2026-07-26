'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function getDesktopHeaderDataAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { userId, organizationId } = session;

    // 1. Get user's organizations
    const orgs = await prisma.organization.findMany({
      where: {
        OR: [
          { id: organizationId },
          { parentOrganizationId: organizationId }
        ]
      },
      select: { id: true, name: true }
    });

    const organizations = orgs.map((o: { id: string; name: string }) => ({
      id: o.id,
      name: o.name,
      isCurrent: o.id === organizationId,
    }));

    // 2. Get active tasks for current organization
    const tasks = await prisma.task.findMany({
      where: {
        organizationId,
        assignees: { some: { userId } }
      },
      include: {
        project: { select: { id: true, name: true } },
        status: { select: { name: true, color: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    const taskOptions = tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      projectName: t.project?.name || 'No Project',
      statusName: t.status?.name || 'Open',
    }));

    // 3. Get any active timer running for this member
    const activeTimer = await prisma.activeTimer.findUnique({
      where: { memberId: userId },
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } }
      }
    });

    return {
      success: true,
      currentOrgId: organizationId,
      organizations,
      tasks: taskOptions,
      activeTimer: activeTimer ? {
        id: activeTimer.id,
        projectId: activeTimer.projectId,
        taskId: activeTimer.taskId,
        startTime: activeTimer.startTime.toISOString(),
        taskTitle: activeTimer.task?.title,
        projectName: activeTimer.project?.name,
      } : null,
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to load desktop header data.' };
  }
}
