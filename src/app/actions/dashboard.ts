'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function getDashboardDataAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    // 1. Owner Dashboard View
    if (role === 'OWNER') {
      const [totalProjects, totalUsers, totalHoursObj, recentLogs] = await Promise.all([
        prisma.project.count({ where: { organizationId } }),
        prisma.user.count({ where: { organizationId } }),
        prisma.timesheet.aggregate({
          where: { organizationId },
          _sum: { hours: true },
        }),
        prisma.timesheet.findMany({
          where: { organizationId },
          include: { user: { select: { name: true, role: true } } },
          orderBy: { date: 'desc' },
          take: 5,
        }),
      ]);

      const projects = await prisma.project.findMany({
        where: { organizationId },
        select: { status: true },
      });

      const projectStatusCounts = {
        PLANNING: projects.filter((p) => p.status === 'PLANNING').length,
        IN_PROGRESS: projects.filter((p) => p.status === 'IN_PROGRESS').length,
        ON_HOLD: projects.filter((p) => p.status === 'ON_HOLD').length,
        COMPLETE: projects.filter((p) => p.status === 'COMPLETE').length,
      };

      return {
        success: true,
        view: 'OWNER',
        metrics: {
          totalProjects,
          totalUsers,
          totalHours: totalHoursObj._sum.hours || 0,
          projectStatusCounts,
          recentLogs,
        },
      };
    }

    // 2. Member/Project Manager Dashboard View
    if (role === 'MEMBER') {
      // Find projects where user is assigned or is Project Manager
      const [assignedProjects, myHoursObj, myTasks, recentLogs] = await Promise.all([
        prisma.project.findMany({
          where: {
            organizationId,
            OR: [
              { assignees: { some: { userId } } },
              { projectManagerId: userId },
            ],
          },
          include: {
            projectManager: { select: { name: true } },
          },
        }),
        prisma.timesheet.aggregate({
          where: { userId, organizationId },
          _sum: { hours: true },
        }),
        prisma.task.findMany({
          where: {
            project: { organizationId },
            assignees: { some: { userId } },
          },
          include: { project: { select: { name: true } } },
        }),
        prisma.timesheet.findMany({
          where: { userId, organizationId },
          orderBy: { date: 'desc' },
          take: 5,
        }),
      ]);

      // Check if they manage any projects to customize view
      const managedProjects = assignedProjects.filter((p) => p.projectManagerId === userId);

      return {
        success: true,
        view: managedProjects.length > 0 ? 'PROJECT_MANAGER' : 'MEMBER',
        metrics: {
          totalProjects: assignedProjects.length,
          totalManagedProjects: managedProjects.length,
          totalHours: myHoursObj._sum.hours || 0,
          myTasks,
          recentLogs,
          assignedProjects,
        },
      };
    }

    // 3. Client Dashboard View
    if (role === 'CLIENT') {
      // Client only sees projects they are linked to
      const clientProjects = await prisma.project.findMany({
        where: { organizationId, clientId: userId },
        include: {
          tasks: {
            include: {
              assignees: { include: { user: { select: { name: true } } } },
            },
          },
        },
      });

      // Sum hours logged by team members on these projects
      // We'll query actual logs to sum up hours
      const projectIds = clientProjects.map((p) => p.id);

      // Let's get total hours of tracking for these projects
      const trackingLogs = await prisma.timeTracking.findMany({
        where: {
          projectId: { in: projectIds },
          organizationId,
          endTime: { not: null },
        },
      });

      let totalHours = 0;
      trackingLogs.forEach((log) => {
        if (log.endTime) {
          const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        }
      });

      return {
        success: true,
        view: 'CLIENT',
        metrics: {
          totalProjects: clientProjects.length,
          totalHours: Math.round(totalHours * 100) / 100,
          projects: clientProjects,
        },
      };
    }

    return { error: 'Unknown user role' };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch dashboard statistics.' };
  }
}

export async function getReportsDataAction(filter: {
  projectId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, organizationId, userId } = session;

    // Filter construction
    let trackingWhereClause: any = { organizationId };

    if (role === 'CLIENT') {
      // Client can only view reports for their own projects
      const clientProjects = await prisma.project.findMany({
        where: { organizationId, clientId: userId },
        select: { id: true },
      });
      const ids = clientProjects.map((p) => p.id);
      trackingWhereClause.projectId = { in: ids };
    } else if (role === 'MEMBER') {
      // Member can see only their own reports or projects they manage
      const memberProjects = await prisma.project.findMany({
        where: {
          organizationId,
          OR: [
            { assignees: { some: { userId } } },
            { projectManagerId: userId },
          ],
        },
        select: { id: true },
      });
      const ids = memberProjects.map((p) => p.id);
      trackingWhereClause.projectId = { in: ids };

      // unless filtering by user, they only see their own time logs
      if (!filter.projectId && !filter.userId) {
        trackingWhereClause.userId = userId;
      }
    }

    if (filter.projectId) {
      trackingWhereClause.projectId = filter.projectId;
    }
    if (filter.userId && role === 'OWNER') {
      trackingWhereClause.userId = filter.userId;
    }
    if (filter.startDate || filter.endDate) {
      trackingWhereClause.startTime = {};
      if (filter.startDate) {
        trackingWhereClause.startTime.gte = new Date(filter.startDate);
      }
      if (filter.endDate) {
        // end of day for the end date
        const end = new Date(filter.endDate);
        end.setHours(23, 59, 59, 999);
        trackingWhereClause.startTime.lte = end;
      }
    }

    const logs = await prisma.timeTracking.findMany({
      where: trackingWhereClause,
      include: {
        user: { select: { name: true, email: true } },
        project: { select: { name: true } },
        task: { select: { title: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    // Formulate project-level summaries and user-level summaries
    const summaries: any = {};
    let grandTotalHours = 0;

    logs.forEach((log) => {
      if (!log.endTime) return;
      const hours = (new Date(log.endTime).getTime() - new Date(log.startTime).getTime()) / (1000 * 60 * 60);
      grandTotalHours += hours;

      const pName = log.project.name;
      if (!summaries[pName]) {
        summaries[pName] = { hours: 0, logsCount: 0 };
      }
      summaries[pName].hours += hours;
      summaries[pName].logsCount += 1;
    });

    const projectSummary = Object.keys(summaries).map((name) => ({
      name,
      hours: Math.round(summaries[name].hours * 100) / 100,
      logsCount: summaries[name].logsCount,
    }));

    return {
      success: true,
      logs: logs.map((l) => {
        const h = l.endTime
          ? Math.round(((new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / (1000 * 60 * 60)) * 100) / 100
          : 0;
        return {
          id: l.id,
          userName: l.user.name,
          projectName: l.project.name,
          taskName: l.task?.title || 'N/A',
          startTime: l.startTime,
          endTime: l.endTime,
          description: l.description || '',
          hours: h,
        };
      }),
      projectSummary,
      grandTotalHours: Math.round(grandTotalHours * 100) / 100,
    };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch report data.' };
  }
}
