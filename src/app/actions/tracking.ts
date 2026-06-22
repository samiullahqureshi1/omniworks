'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// Timesheet Actions
export async function logTimesheetAction(formData: FormData) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const dateStr = formData.get('date') as string;
    const hoursStr = formData.get('hours') as string;
    const description = formData.get('description') as string;

    if (!dateStr || !hoursStr) {
      return { error: 'Date and hours are required.' };
    }

    const date = new Date(dateStr);
    const hours = parseFloat(hoursStr);

    if (isNaN(hours) || hours <= 0) {
      return { error: 'Hours must be a valid positive number.' };
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        userId: session.userId,
        organizationId: session.organizationId,
        date,
        hours,
        description,
      },
    });

    return { success: true, timesheet };
  } catch (error: any) {
    return { error: error.message || 'Failed to log timesheet.' };
  }
}

export async function getTimesheetsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Tenant isolation
    let whereClause: any = { organizationId: session.organizationId };

    // Owner sees all timesheets, others see only their own
    if (session.role !== 'OWNER') {
      whereClause.userId = session.userId;
    }

    const timesheets = await prisma.timesheet.findMany({
      where: whereClause,
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { date: 'desc' },
    });

    return { success: true, timesheets };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch timesheets.' };
  }
}

export async function deleteTimesheetAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const item = await prisma.timesheet.findFirst({
      where: { id, organizationId: session.organizationId },
    });

    if (!item) return { error: 'Timesheet entry not found.' };

    // Owners can delete any entry, others only their own
    if (session.role !== 'OWNER' && item.userId !== session.userId) {
      return { error: 'Unauthorized to delete this timesheet entry.' };
    }

    await prisma.timesheet.delete({
      where: { id },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete timesheet entry.' };
  }
}

// Active Time Tracking Timer Actions
export async function startTimerAction(projectId: string, taskId?: string, description?: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Check if there's already an active timer
    const activeTimer = await prisma.timeTracking.findFirst({
      where: {
        userId: session.userId,
        endTime: null,
      },
    });

    if (activeTimer) {
      return { error: 'You already have an active timer running. Please stop it first.' };
    }

    const timer = await prisma.timeTracking.create({
      data: {
        userId: session.userId,
        organizationId: session.organizationId,
        projectId,
        taskId: taskId || null,
        description: description || null,
        startTime: new Date(),
      },
    });

    return { success: true, timer };
  } catch (error: any) {
    return { error: error.message || 'Failed to start timer.' };
  }
}

export async function stopTimerAction(description?: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const activeTimer = await prisma.timeTracking.findFirst({
      where: {
        userId: session.userId,
        endTime: null,
      },
    });

    if (!activeTimer) {
      return { error: 'No active timer found.' };
    }

    const stopTime = new Date();
    
    // Calculate total hours logged and also add it to timesheets as logged hours for simplicity
    const diffMs = stopTime.getTime() - new Date(activeTimer.startTime).getTime();
    const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // round to 2 decimals

    const updated = await prisma.timeTracking.update({
      where: { id: activeTimer.id },
      data: {
        endTime: stopTime,
        description: description || activeTimer.description,
      },
    });

    // Also automatically log to weekly timesheet if hours > 0
    if (hours > 0) {
      await prisma.timesheet.create({
        data: {
          userId: session.userId,
          organizationId: session.organizationId,
          date: new Date(),
          hours,
          description: description || activeTimer.description || 'Logged via Timer',
        },
      });
    }

    return { success: true, timer: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to stop timer.' };
  }
}

export async function getActiveTimerAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const activeTimer = await prisma.timeTracking.findFirst({
      where: {
        userId: session.userId,
        endTime: null,
      },
      include: {
        project: {
          select: { name: true },
        },
        task: {
          select: { name: true },
        },
      },
    });

    return { success: true, timer: activeTimer };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch active timer.' };
  }
}

export async function getTimerLogsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    let whereClause: any = { organizationId: session.organizationId };

    // Owner sees all, members see their own
    if (session.role !== 'OWNER') {
      whereClause.userId = session.userId;
    }

    const logs = await prisma.timeTracking.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
        project: { select: { name: true } },
        task: { select: { name: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    return { success: true, logs };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch timer logs.' };
  }
}
