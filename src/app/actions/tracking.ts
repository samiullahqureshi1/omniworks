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
          return {
            error: 'Allocated hours for this task are completed. Please request additional hours.',
            code: 'allocated_hours_exceeded',
            taskId,
            taskTitle: task.title,
          };
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
    const startTime = new Date(activeTimer.startTime);

    // Active-only duration: subtract idle/sleep time from total wall-clock time
    const totalElapsedSecs = Math.max(0, Math.floor((stopTime.getTime() - startTime.getTime()) / 1000));
    const idleSecs = Math.max(0, Math.floor(activeTimer.idleDuration || 0));
    const activeOnlySecs = Math.max(0, totalElapsedSecs - idleSecs);
    const activeOnlyHours = activeOnlySecs / 3600;

    const entry = await prisma.timeEntry.create({
      data: {
        organizationId: session.organizationId,
        projectId: activeTimer.projectId,
        taskId: activeTimer.taskId,
        memberId: session.userId,
        startTime: activeTimer.startTime,
        endTime: stopTime,
        duration: activeOnlyHours,           // save active-only hours
        activeWorkedDuration: activeOnlySecs, // active seconds
        idleDuration: idleSecs,               // idle/sleep seconds
        entryType: TimeEntryType.TIMER,
        status: TimeEntryStatus.SAVED,
        notes: notes || '',
        createdBy: session.userId,
      }
    });

    // Update Task trackedHours with active-only duration
    if (activeTimer.taskId && activeOnlySecs > 0) {
      await prisma.task.update({
        where: { id: activeTimer.taskId },
        data: {
          trackedHours: {
            increment: activeOnlyHours,
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

// Pinged every 15 seconds from the client heartbeat
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
    let isSleeping = false;
    let wokeUp = false;

    if (activeTimer.isIdle) {
      // Currently sleeping/idle
      if (isActive) {
        // User woke up — resume active tracking
        updateData.isIdle = false;
        updateData.lastActivityAt = now;
        updateData.idleStartedAt = null;
        wokeUp = true;
      } else {
        // Still sleeping — accumulate idle duration (15s heartbeat)
        updateData.idleDuration = { increment: 15 };
      }
    } else {
      // Currently active
      if (!isActive && timeSinceLastActivity >= 5 * 60) {
        // 5 minutes of no activity → enter sleep mode
        updateData.isIdle = true;
        updateData.idleStartedAt = new Date(now.getTime() - 5 * 60 * 1000); // 5 min ago
        updateData.idleDuration = { increment: 5 * 60 }; // mark 5 min as idle
        isSleeping = true;
      } else if (isActive) {
        updateData.lastActivityAt = now;
        updateData.activeWorkedDuration = { increment: 15 }; // 15s heartbeat
      } else {
        // Activity within 5 min window — still count as active
        updateData.activeWorkedDuration = { increment: 15 };
      }
    }

    const updated = await prisma.activeTimer.update({
      where: { id: activeTimer.id },
      data: updateData
    });

    if (isSleeping) {
      emitAppEvent('timer_sleeping', `organization:${session.organizationId}`, updated);
      emitAppEvent('timer_sleeping', `user:${session.userId}`, updated);
    } else if (wokeUp) {
      emitAppEvent('timer_woke_up', `organization:${session.organizationId}`, updated);
      emitAppEvent('timer_woke_up', `user:${session.userId}`, updated);
    }

    // Check auto-stop: compare ACTIVE-ONLY seconds against allocated hours
    if (activeTimer.task?.allocatedHours && !isSleeping) {
      const activeOnlySecs = updated.activeWorkedDuration;
      const activeOnlyHours = activeOnlySecs / 3600;
      const previousTracked = activeTimer.task.trackedHours || 0;
      if (previousTracked + activeOnlyHours >= activeTimer.task.allocatedHours) {
        // Auto stop because active hours reached the allocated limit
        await stopTimerAction('Auto-stopped: allocated hours reached.');
        emitAppEvent('timer_auto_stopped', `user:${session.userId}`, {
          reason: 'allocated_hours_reached',
          taskTitle: activeTimer.task.title,
          allocatedHours: activeTimer.task.allocatedHours,
        });
        return { success: true, autoStopped: true, reason: 'allocated_hours_reached', taskTitle: activeTimer.task.title };
      }
    }

    return { success: true, timer: updated, isSleeping, wokeUp };
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

export async function getDailyWorksnapsDataAction(dateStr: string, memberId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') return { error: 'Unauthorized' };

    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const screenshots = await prisma.timeScreenshot.findMany({
      where: {
        organizationId: session.organizationId,
        memberId,
        capturedAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } }
      },
      orderBy: { capturedAt: 'asc' }
    });

    const entries = await prisma.timeEntry.findMany({
      where: {
        organizationId: session.organizationId,
        memberId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    return { success: true, screenshots, entries };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch worksnaps data.' };
  }
}

export async function uploadScreenshotAction(base64Image: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const activeTimer = await prisma.activeTimer.findUnique({
      where: { memberId: session.userId }
    });

    if (!activeTimer) return { error: 'No active timer found.' };

    let screenshotUrl = base64Image;

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || 'unsigned_preset';

    if (cloudName) {
      try {
        const formData = new FormData();
        formData.append('file', base64Image);
        formData.append('upload_preset', uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.secure_url) {
          screenshotUrl = data.secure_url;
        }
      } catch (e) {
        console.error('Cloudinary REST upload error, falling back to stored data:', e);
      }
    }

    const screenshot = await prisma.timeScreenshot.create({
      data: {
        organizationId: session.organizationId,
        projectId: activeTimer.projectId,
        taskId: activeTimer.taskId,
        memberId: session.userId,
        activeTimerId: activeTimer.id,
        screenshotUrl,
        capturedAt: new Date(),
        activityLevel: 100,
      }
    });

    return { success: true, screenshotUrl: screenshot.screenshotUrl };
  } catch (err: any) {
    return { error: err.message || 'Failed to upload screenshot.' };
  }
}

export async function clearTrackedTimeAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    await prisma.activeTimer.deleteMany({});
    await prisma.timeScreenshot.deleteMany({});
    await prisma.activityLog.deleteMany({});
    await prisma.timeEntry.deleteMany({});
    await prisma.task.updateMany({
      data: { trackedHours: 0 }
    });

    return { success: true, message: 'All tracked time cleared successfully.' };
  } catch (err: any) {
    return { error: err.message || 'Failed to clear tracked time.' };
  }
}
