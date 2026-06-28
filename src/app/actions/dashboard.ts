"use server";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
type ProjectIdOnly = {
  id: string;
};
 type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETE";

    type ProjectStatusOnly = {
      status: ProjectStatus | string | null;
    };

    type TimeLog = {
      id: string;
      activeWorkedDuration: number | null;
      startTime: Date;
      endTime: Date | null;
      notes: string | null;
      member?: {
        id?: string;
        name?: string | null;
        email?: string | null;
        role?: string;
      } | null;
      project?: {
        id?: string;
        name?: string | null;
      } | null;
      task?: {
        id?: string;
        title?: string | null;
      } | null;
    };
export async function getDashboardDataAction() {
  try {
    const session = await getSession();
    if (!session) return { error: "Unauthorized" };

    const { role, userId, organizationId } = session;
   
    // 1. Owner Dashboard View
    if (role === "OWNER") {
      const [totalProjects, totalUsers, totalHoursObj, recentLogs, recentTasks, pendingPastDueCount, totalCompleteTasks, totalPendingTasks] =
        await Promise.all([
          prisma.project.count({ where: { organizationId } }),
          prisma.user.count({ where: { organizationId } }),
          prisma.timeEntry.aggregate({
            where: { organizationId },
            _sum: { activeWorkedDuration: true },
          }),
          prisma.timeEntry.findMany({
            where: { organizationId },
            include: { member: { select: { name: true, role: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
          prisma.task.findMany({
            where: { organizationId },
            include: {
              project: { select: { name: true } },
              assignees: { include: { user: { select: { name: true } } } },
              status: true
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          }),
          prisma.task.count({
            where: {
              organizationId,
              dueDate: { lt: new Date() },
              status: { name: { not: "Done" } } // Approximation
            }
          }),
          prisma.task.count({
            where: { organizationId, status: { name: { in: ["Done", "Completed"] } } }
          }),
          prisma.task.count({
            where: { organizationId, status: { name: { notIn: ["Done", "Completed"] } } }
          })
        ]);

      const projects = await prisma.project.findMany({
        where: { organizationId },
        include: { status: true },
      });
      const projectStatusCounts = {
        PLANNING: projects.filter(
          (p: any) => !p.status?.name || p.status?.name?.toLowerCase().includes('plan') || p.status?.name?.toLowerCase().includes('backlog')
        ).length,
        IN_PROGRESS: projects.filter(
          (p: any) => p.status?.name?.toLowerCase().includes('progress') || p.status?.name?.toLowerCase().includes('active')
        ).length,
        ON_HOLD: projects.filter(
          (p: any) => p.status?.name?.toLowerCase().includes('hold') || p.status?.name?.toLowerCase().includes('pause')
        ).length,
        COMPLETE: projects.filter(
          (p: any) => p.status?.name?.toLowerCase().includes('complete') || p.status?.name?.toLowerCase().includes('done')
        ).length,
      };
      return {
        success: true,
        view: "OWNER",
        metrics: {
          totalProjects,
          totalUsers,
          totalHours: (totalHoursObj._sum.activeWorkedDuration || 0) / 3600,
          projectStatusCounts,
          recentLogs,
          recentTasks,
          pendingPastDueCount,
          totalCompleteTasks,
          totalPendingTasks
        },
      };
    }

    // 2. Member/Project Manager Dashboard View
    if (role === "MEMBER") {
      // Find projects where user is assigned or is Project Manager
      const [assignedProjects, myHoursObj, myTasks, recentLogs] =
        await Promise.all([
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
          prisma.timeEntry.aggregate({
            where: { memberId: userId, organizationId },
            _sum: { activeWorkedDuration: true },
          }),
          prisma.task.findMany({
            where: {
              project: { organizationId },
              assignees: { some: { userId } },
            },
            include: { project: { select: { name: true } }, status: true },
          }),
          prisma.timeEntry.findMany({
            where: { organizationId },
            orderBy: { createdAt: "desc" },
            take: 5,
          }),
        ]);

      // Check if they manage any projects to customize view
      // const managedProjects = assignedProjects.filter((p) => p.projectManagerId === userId);
      const managedProjects = assignedProjects.filter(
        (p: any) => p.projectManagerId === userId,
      );
      return {
        success: true,
        view: managedProjects.length > 0 ? "PROJECT_MANAGER" : "MEMBER",
        metrics: {
          totalProjects: assignedProjects.length,
          totalManagedProjects: managedProjects.length,
          totalHours: (myHoursObj._sum.activeWorkedDuration || 0) / 3600,
          myTasks,
          recentLogs,
          assignedProjects,
        },
      };
    }

    // 3. Client Dashboard View
    if (role === "CLIENT") {
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
      // const projectIds = clientProjects.map((p) => p.id);
      const projectIds = clientProjects.map((p: ProjectIdOnly) => p.id);
      // Let's get total hours of tracking for these projects
      const trackingLogs = await prisma.timeEntry.findMany({
        where: {
          projectId: { in: projectIds },
          organizationId,
        },
      });

      let totalHours = 0;
      // trackingLogs.forEach((log) => {
      trackingLogs.forEach((log: TimeLog) => {
        if (log.activeWorkedDuration) {
          totalHours += log.activeWorkedDuration / 3600;
        }
      });

      return {
        success: true,
        view: "CLIENT",
        metrics: {
          totalProjects: clientProjects.length,
          totalHours: Math.round(totalHours * 100) / 100,
          projects: clientProjects,
        },
      };
    }

    return { error: "Unknown user role" };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch dashboard statistics." };
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
    if (!session) return { error: "Unauthorized" };

    const { role, organizationId, userId } = session;

    // Filter construction
    let trackingWhereClause: any = { organizationId };

    if (role === "CLIENT") {
      // Client can only view reports for their own projects
      const clientProjects = await prisma.project.findMany({
        where: { organizationId, clientId: userId },
        select: { id: true },
      });
      // const ids = clientProjects.map((p) => p.id);
      const ids = clientProjects.map((p: ProjectIdOnly) => p.id);
      trackingWhereClause.projectId = { in: ids };
    } else if (role === "MEMBER") {
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
      // const ids = memberProjects.map((p) => p.id);
      const ids = memberProjects.map((p: ProjectIdOnly) => p.id);
      trackingWhereClause.projectId = { in: ids };

      // unless filtering by user, they only see their own time logs
      if (!filter.projectId && !filter.userId) {
        trackingWhereClause.memberId = userId;
      }
    }

    if (filter.projectId) {
      trackingWhereClause.projectId = filter.projectId;
    }
    if (filter.userId && role === "OWNER") {
      trackingWhereClause.memberId = filter.userId;
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

    const logs = await prisma.timeEntry.findMany({
      where: trackingWhereClause,
      include: {
        member: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { startTime: "desc" },
    });

    const summaryByProject: Record<string, number> = {};
    const summaryByUser: Record<string, number> = {};
    let totalHours = 0;

    // logs.forEach((log) => {
    logs.forEach((log: TimeLog) => {
      const hours = (log.activeWorkedDuration || 0) / 3600;

      const pName = log.project?.name || "Unknown";
      const uName = log.member?.name || "Unknown";

      summaryByProject[pName] = (summaryByProject[pName] || 0) + hours;
      summaryByUser[uName] = (summaryByUser[uName] || 0) + hours;
      totalHours += hours;
    });

    const projectSummary = Object.keys(summaryByProject).map((name) => ({
      name,
      hours: Math.round(summaryByProject[name] * 100) / 100,
    }));

    return {
      success: true,
      // logs: logs.map((l) => {
      logs: logs.map((l: TimeLog) => {
        const h = l.activeWorkedDuration
          ? Math.round((l.activeWorkedDuration / 3600) * 100) / 100
          : 0;
        return {
          id: l.id,
          userName: l.member?.name || "Unknown",
          // projectName: l.project.name,
          projectName: l.project?.name || "Unknown",
          taskName: l.task?.title || "N/A",
          startTime: l.startTime,
          endTime: l.endTime,
          description: l.notes || "",
          hours: h,
        };
      }),
      projectSummary,
      grandTotalHours: Math.round(totalHours * 100) / 100,
    };
  } catch (error: any) {
    return { error: error.message || "Failed to fetch report data." };
  }
}
