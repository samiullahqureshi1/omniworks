import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-desktop-secret-key-123';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const organizationId = decoded.organizationId;
    const body = await request.json();

    const { activeTimers, timeEntries, screenshots, activityLogs, idlePeriods } = body;

    // We can use a transaction or just bulk inserts depending on the structure
    // Since desktop app syncs periodically, we handle upserts and creates

    // 1. Sync ActiveTimer (update or create the user's active timer)
    if (activeTimers && activeTimers.length > 0) {
      const timer = activeTimers[0];
      await prisma.activeTimer.upsert({
        where: { memberId: userId },
        update: {
          projectId: timer.projectId,
          taskId: timer.taskId,
          lastActivityAt: new Date(timer.lastActivityAt),
          idleStartedAt: timer.idleStartedAt ? new Date(timer.idleStartedAt) : null,
          isIdle: timer.isIdle,
          activeWorkedDuration: timer.activeWorkedDuration,
          idleDuration: timer.idleDuration,
        },
        create: {
          organizationId,
          memberId: userId,
          projectId: timer.projectId,
          taskId: timer.taskId,
          startTime: new Date(timer.startTime),
          lastActivityAt: new Date(timer.lastActivityAt),
          idleStartedAt: timer.idleStartedAt ? new Date(timer.idleStartedAt) : null,
          isIdle: timer.isIdle,
          activeWorkedDuration: timer.activeWorkedDuration,
          idleDuration: timer.idleDuration,
        }
      });
    } else if (body.stopTimer) {
      await prisma.activeTimer.deleteMany({ where: { memberId: userId } });
    }

    // 2. Sync TimeEntries (if desktop app stopped a timer and submits a completed entry)
    if (timeEntries && timeEntries.length > 0) {
      for (const entry of timeEntries) {
        const startOfDay = new Date(entry.startTime);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(entry.startTime);
        endOfDay.setHours(23, 59, 59, 999);

        let existingEntry = await prisma.timeEntry.findFirst({
          where: {
            memberId: userId,
            projectId: entry.projectId,
            taskId: entry.taskId,
            startTime: {
              gte: startOfDay,
              lte: endOfDay,
            }
          }
        });

        if (existingEntry) {
          await prisma.timeEntry.update({
            where: { id: existingEntry.id },
            data: {
              endTime: new Date(entry.endTime),
              duration: (existingEntry.duration || 0) + entry.duration,
              activeWorkedDuration: (existingEntry.activeWorkedDuration || 0) + entry.activeWorkedDuration,
              idleDuration: (existingEntry.idleDuration || 0) + entry.idleDuration,
            }
          });
        } else {
          await prisma.timeEntry.create({
            data: {
              organizationId,
              memberId: userId,
              projectId: entry.projectId,
              taskId: entry.taskId,
              startTime: new Date(entry.startTime),
              endTime: new Date(entry.endTime),
              duration: entry.duration,
              activeWorkedDuration: entry.activeWorkedDuration,
              idleDuration: entry.idleDuration,
              entryType: 'TIMER',
              status: 'SAVED',
            }
          });
        }
      }
    }

    // 3. Sync Screenshots
    if (screenshots && screenshots.length > 0) {
      await prisma.timeScreenshot.createMany({
        data: screenshots.map((s: any) => ({
          organizationId,
          memberId: userId,
          projectId: s.projectId,
          taskId: s.taskId,
          screenshotUrl: s.screenshotUrl,
          capturedAt: new Date(s.capturedAt),
          activityLevel: s.activityLevel,
          activeTimerId: s.activeTimerId || undefined,
          timeEntryId: s.timeEntryId || undefined,
        })),
        skipDuplicates: true,
      });
    }

    // 4. Sync ActivityLogs
    if (activityLogs && activityLogs.length > 0) {
      await prisma.activityLog.createMany({
        data: activityLogs.map((l: any) => ({
          organizationId,
          memberId: userId,
          timestamp: new Date(l.timestamp),
          keystrokes: l.keystrokes,
          mouseMovements: l.mouseMovements,
          activityPercentage: l.activityPercentage,
          activeTimerId: l.activeTimerId || undefined,
          timeEntryId: l.timeEntryId || undefined,
        })),
        skipDuplicates: true,
      });
    }

    // 5. Sync IdlePeriods
    if (idlePeriods && idlePeriods.length > 0) {
      await prisma.idlePeriod.createMany({
        data: idlePeriods.map((i: any) => ({
          organizationId,
          memberId: userId,
          startTime: new Date(i.startTime),
          endTime: i.endTime ? new Date(i.endTime) : null,
          duration: i.duration,
          timeEntryId: i.timeEntryId || undefined,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error: any) {
    console.error('Desktop sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
