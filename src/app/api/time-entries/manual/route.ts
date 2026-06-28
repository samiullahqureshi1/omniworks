import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { emitAppEvent } from '@/lib/events';
import { TimeEntryType, TimeEntryStatus } from '@prisma/client';
import { createNotification } from '@/app/actions/notifications';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { organizationId, projectId, taskId, memberId, date, duration, startTime, endTime, notes } = body;

    if (organizationId !== session.organizationId) {
      return NextResponse.json({ error: 'Invalid organization.' }, { status: 403 });
    }
    
    if (!projectId || !taskId || !memberId || !date || duration === undefined) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    if (duration <= 0) {
      return NextResponse.json({ error: 'Duration must be greater than 0.' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId, projectId, organizationId },
      include: { project: true, assignees: true }
    });

    if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 });

    // Role-based validation
    if (session.role === 'CLIENT') {
      return NextResponse.json({ error: 'Clients cannot add manual hours.' }, { status: 403 });
    }

    const isOwner = session.role === 'OWNER';
    const isPM = task.project.projectManagerId === session.userId;

    if (!isOwner && !isPM) {
      // Member context
      if (memberId !== session.userId) {
        return NextResponse.json({ error: 'You can only add manual hours for yourself.' }, { status: 403 });
      }
      const isAssigned = task.assignees.some(a => a.userId === session.userId);
      if (!isAssigned) {
        return NextResponse.json({ error: 'You are not assigned to this task.' }, { status: 403 });
      }
    }
    
    // Task Hours Validation
    if (task.allocatedHours) {
      const tracked = task.trackedHours || 0;
      if (tracked + duration > task.allocatedHours) {
        return NextResponse.json({ error: 'Manual hours exceed the remaining allocated hours for this task. Increase task allocated hours or reduce manual hours.' }, { status: 400 });
      }
    }

    let actualStartTime = new Date(date);
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      actualStartTime.setHours(hours, minutes, 0, 0);
    }
    
    let actualEndTime = new Date(actualStartTime.getTime() + duration * 3600 * 1000);
    if (endTime) {
       const [hours, minutes] = endTime.split(':').map(Number);
       let tempEnd = new Date(date);
       tempEnd.setHours(hours, minutes, 0, 0);
       if (tempEnd < actualStartTime) {
         return NextResponse.json({ error: 'End Time cannot be before Start Time.' }, { status: 400 });
       }
       actualEndTime = tempEnd;
    }

    const startOfDay = new Date(actualStartTime);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(actualStartTime);
    endOfDay.setHours(23, 59, 59, 999);

    let entry = await prisma.timeEntry.findFirst({
      where: {
        memberId,
        projectId,
        taskId,
        startTime: {
          gte: startOfDay,
          lte: endOfDay,
        }
      }
    });

    if (entry) {
      entry = await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          endTime: actualEndTime > (entry.endTime || new Date(0)) ? actualEndTime : entry.endTime,
          duration: (entry.duration || 0) + duration,
          activeWorkedDuration: (entry.activeWorkedDuration || 0) + (duration * 3600),
          notes: notes ? (entry.notes ? `${entry.notes}\n${notes}` : notes) : entry.notes,
        }
      });
    } else {
      entry = await prisma.timeEntry.create({
        data: {
          organizationId,
          projectId,
          taskId,
          memberId,
          startTime: actualStartTime,
          endTime: actualEndTime,
          duration: duration,
          activeWorkedDuration: duration * 3600,
          idleDuration: 0,
          entryType: TimeEntryType.MANUAL,
          status: TimeEntryStatus.SAVED,
          notes: notes || '',
          createdBy: session.userId,
        }
      });
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { trackedHours: { increment: duration } }
    });

    emitAppEvent('manual_time_added', `organization:${organizationId}`, entry);
    emitAppEvent('manual_time_added', `project:${projectId}`, entry);
    emitAppEvent('manual_time_added', `task:${taskId}`, entry);
    emitAppEvent('manual_time_added', `user:${memberId}`, entry);
    emitAppEvent('task_hours_updated', `task:${taskId}`, updatedTask);

    await createNotification({
      organizationId,
      projectId,
      taskId,
      timeEntryId: entry.id,
      actorId: session.userId,
      actorRole: session.role,
      type: 'manual_time_added',
      title: 'Manual Time Added',
      message: `${session.name} added ${duration} hours manually.`,
      actionUrl: `/workspace/timesheet`,
      clientVisible: false
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    console.error('Manual Entry Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
