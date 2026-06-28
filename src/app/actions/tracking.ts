'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { TimeEntryType, TimeEntryStatus } from '@prisma/client';
import { emitAppEvent } from '@/lib/events';
import { createNotification } from './notifications';

export async function startTimerAction(projectId: string, taskId?: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Check if there's already an active timer
    const existing = await prisma.activeTimer.findUnique({
      where: { memberId: session.userId }
    });

    if (existing) {
      return { error: 'You already have an active timer running. Please stop it first.' };
    }

    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (task?.allocatedHours) {
        const tracked = task.trackedHours || 0;
        if (tracked >= task.allocatedHours) {
          return { error: 'Allocated hours for this task are completed. Please ask Owner/Admin or Project Manager to increase task allocated hours.' };
        }
      }
    }

    const now = new Date();
    const timer = await prisma.activeTimer.create({
      data: {
        organizationId: session.organizationId,
        projectId,
        taskId: taskId || null,
        memberId: session.userId,
        startTime: now,
        lastActivityAt: now,
        isIdle: false,
        activeWorkedDuration: 0,
        idleDuration: 0,
      },
    });

    emitAppEvent('timer_started', `organization:${session.organizationId}`, timer);
    emitAppEvent('timer_started', `project:${projectId}`, timer);
    if (taskId) emitAppEvent('timer_started', `task:${taskId}`, timer);
    emitAppEvent('timer_started', `user:${session.userId}`, timer);

    await createNotification({
      organizationId: session.organizationId,
      projectId: projectId,
      taskId: taskId || undefined,
      actorId: session.userId,
      actorRole: session.role,
      type: 'timer_started',
      title: 'Timer Started',
      message: `${session.name} started a timer.`,
      actionUrl: `/workspace/time`,
      clientVisible: false
    });

    return { success: true, timer };
  } catch (error: any) {
    console.error('Start timer error:', error);
    return { error: error.message || 'Failed to start timer.' };
  }
}

export async function stopTimerAction(notes?: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const activeTimer = await prisma.activeTimer.findUnique({
      where: { memberId: session.userId }
    });

    if (!activeTimer) {
      return { error: 'No active timer found.' };
    }

    const stopTime = new Date();
    
    const startOfDay = new Date(activeTimer.startTime);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(activeTimer.startTime);
    endOfDay.setHours(23, 59, 59, 999);

    let entry = await prisma.timeEntry.findFirst({
      where: {
        memberId: session.userId,
        projectId: activeTimer.projectId,
        taskId: activeTimer.taskId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    });

    const addedDuration = (activeTimer.activeWorkedDuration + activeTimer.idleDuration) / 3600;

    if (entry) {
      entry = await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          endTime: stopTime,
          duration: (entry.duration || 0) + addedDuration,
          activeWorkedDuration: (entry.activeWorkedDuration || 0) + activeTimer.activeWorkedDuration,
          idleDuration: (entry.idleDuration || 0) + activeTimer.idleDuration,
          notes: notes ? (entry.notes ? `${entry.notes}\n${notes}` : notes) : entry.notes,
        }
      });
    } else {
      entry = await prisma.timeEntry.create({
        data: {
          organizationId: session.organizationId,
          projectId: activeTimer.projectId,
          taskId: activeTimer.taskId,
          memberId: session.userId,
          startTime: activeTimer.startTime,
          endTime: stopTime,
          duration: addedDuration,
          activeWorkedDuration: activeTimer.activeWorkedDuration,
          idleDuration: activeTimer.idleDuration,
          entryType: TimeEntryType.TIMER,
          status: TimeEntryStatus.SAVED,
          notes: notes || '',
          createdBy: session.userId,
        }
      });
    }

    // Update Task trackedHours
    if (activeTimer.taskId) {
      await prisma.task.update({
        where: { id: activeTimer.taskId },
        data: {
          trackedHours: {
            increment: activeTimer.activeWorkedDuration / 3600
          }
        }
      });
    }

    // Delete ActiveTimer
    await prisma.activeTimer.delete({
      where: { id: activeTimer.id }
    });

    emitAppEvent('timer_stopped', `organization:${session.organizationId}`, entry);
    emitAppEvent('timer_stopped', `project:${activeTimer.projectId}`, entry);
    if (activeTimer.taskId) emitAppEvent('timer_stopped', `task:${activeTimer.taskId}`, entry);
    emitAppEvent('timer_stopped', `user:${session.userId}`, entry);

    await createNotification({
      organizationId: session.organizationId,
      projectId: activeTimer.projectId,
      taskId: activeTimer.taskId || undefined,
      actorId: session.userId,
      actorRole: session.role,
      type: 'timer_stopped',
      title: 'Timer Stopped',
      message: `${session.name} stopped a timer.`,
      actionUrl: `/workspace/timesheet`,
      clientVisible: false
    });

    return { success: true, entry };
  } catch (error: any) {
    return { error: error.message || 'Failed to stop timer.' };
  }
}

export async function getActiveTimerAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const timer = await prisma.activeTimer.findUnique({
      where: { memberId: session.userId },
      include: {
        project: { select: { name: true } },
        task: { select: { title: true, allocatedHours: true, trackedHours: true } },
      }
    });

    return { success: true, timer };
  } catch (error: any) {
    return { error: error.message || 'Failed to get active timer.' };
  }
}

// Pinged every minute
export async function reportActivityAction(isActive: boolean) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const activeTimer = await prisma.activeTimer.findUnique({
      where: { memberId: session.userId },
      include: { task: true }
    });

    if (!activeTimer) return { success: true }; // No active timer to report

    const now = new Date();
    const timeSinceLastActivity = (now.getTime() - new Date(activeTimer.lastActivityAt).getTime()) / 1000;
    
    let updateData: any = {};

    if (activeTimer.isIdle) {
      // It's currently idle
      if (isActive) {
        // User resumed work
        updateData.isIdle = false;
        updateData.lastActivityAt = now;
        updateData.idleStartedAt = null;
      } else {
        // Still idle
        updateData.idleDuration = { increment: 60 }; // Assuming 60s ping
      }
    } else {
      // It's currently active
      if (!isActive && timeSinceLastActivity >= 180) { // 3 minutes idle
        updateData.isIdle = true;
        updateData.idleStartedAt = new Date(now.getTime() - 180 * 1000); // 3 minutes ago
        updateData.idleDuration = { increment: 180 };
        // Remove those 180s from active worked duration
        updateData.activeWorkedDuration = { decrement: 180 }; 
      } else if (isActive) {
        updateData.lastActivityAt = now;
        updateData.activeWorkedDuration = { increment: 60 };
      } else {
        // No activity but not yet 3 minutes
        updateData.activeWorkedDuration = { increment: 60 };
      }
    }

    const updated = await prisma.activeTimer.update({
      where: { id: activeTimer.id },
      data: updateData
    });

    if (updateData.isIdle === true) {
      emitAppEvent('timer_idle', `organization:${session.organizationId}`, updated);
      emitAppEvent('timer_idle', `user:${session.userId}`, updated);
    } else if (updateData.isIdle === false) {
      emitAppEvent('timer_resumed', `organization:${session.organizationId}`, updated);
      emitAppEvent('timer_resumed', `user:${session.userId}`, updated);
    }

    // Check auto-stop condition
    if (activeTimer.task?.allocatedHours) {
      const currentTracked = (activeTimer.task.trackedHours || 0) + (updated.activeWorkedDuration / 3600);
      if (currentTracked >= activeTimer.task.allocatedHours) {
        // Auto stop!
        await stopTimerAction('Auto-stopped because allocated hours were completed.');
        return { success: true, autoStopped: true };
      }
    }

    return { success: true, timer: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to report activity.' };
  }
}

  export async function createManualEntryAction(formData: FormData) {
    try {
      const session = await getSession();
      if (!session) return { error: 'Unauthorized' };
  
      let projectId = formData.get('projectId') as string;
      const taskId = formData.get('taskId') as string;
      const dateStr = formData.get('date') as string;
      const durationStr = formData.get('duration') as string;
      const notes = formData.get('notes') as string;
  
      if (!taskId && !projectId) {
        return { error: 'Project or Task is required.' };
      }
      
      let task = null;
      if (taskId) {
        task = await prisma.task.findUnique({ where: { id: taskId } });
        if (!task) return { error: 'Task not found.' };
        projectId = task.projectId; // Auto-derive projectId
      }
  
      if (!projectId || !dateStr || !durationStr) {
        return { error: 'Project, Date, and Duration are required.' };
      }
  
      const durationHrs = parseFloat(durationStr);
      if (isNaN(durationHrs) || durationHrs <= 0) {
        return { error: 'Duration must be a positive number.' };
      }
  
      if (task?.allocatedHours) {
        const tracked = task.trackedHours || 0;
        if (tracked + durationHrs > task.allocatedHours) {
          return { error: `Manual time cannot exceed remaining task allocated hours (${task.allocatedHours - tracked} hrs left).` };
        }
      }

    const startTime = new Date(dateStr);
    
    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: session.organizationId,
        projectId,
        taskId: taskId || null,
        memberId: session.userId,
        startTime,
        endTime: new Date(startTime.getTime() + durationHrs * 3600 * 1000),
        duration: durationHrs,
        activeWorkedDuration: durationHrs * 3600,
        idleDuration: 0,
        entryType: TimeEntryType.MANUAL,
        status: TimeEntryStatus.SAVED,
        notes: notes || '',
        createdBy: session.userId,
      }
    });

    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          trackedHours: {
            increment: durationHrs
          }
        }
      });
    }

    return { success: true, entry };
  } catch (error: any) {
    return { error: error.message || 'Failed to create manual entry.' };
  }
}

export async function getTimeEntriesAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    let whereClause: any = { organizationId: session.organizationId };

    if (session.role === 'MEMBER') {
      whereClause.memberId = session.userId;
    } else if (session.role === 'CLIENT') {
      // Clients only see entries for their projects
      const clientProjects = await prisma.project.findMany({
        where: { clientId: session.userId },
        select: { id: true }
      });
      whereClause.projectId = { in: clientProjects.map(p => p.id) };
    }

    const entries = await prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        member: { select: { name: true, email: true } },
        project: { select: { name: true } },
        task: { select: { title: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 100, // Limit for now
    });

    return { success: true, entries };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch time entries.' };
  }
}

export async function deleteTimeEntryAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const entry = await prisma.timeEntry.findFirst({
      where: { id, organizationId: session.organizationId }
    });

    if (!entry) return { error: 'Time entry not found.' };

    if (session.role !== 'OWNER' && entry.memberId !== session.userId) {
      return { error: 'Unauthorized to delete this entry.' };
    }

    await prisma.timeEntry.delete({ where: { id } });

    // Decrement from task
    if (entry.taskId && entry.activeWorkedDuration) {
      await prisma.task.update({
        where: { id: entry.taskId },
        data: {
          trackedHours: {
            decrement: entry.activeWorkedDuration / 3600
          }
        }
      });
    }

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete entry.' };
  }
}
