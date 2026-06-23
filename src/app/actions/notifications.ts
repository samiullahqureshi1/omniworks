'use server';

import { prisma } from '@/lib/db';
import { emitAppEvent } from '@/lib/events';
import { getSession } from '@/lib/auth';

interface NotificationParams {
  organizationId: string;
  projectId?: string;
  taskId?: string;
  timeEntryId?: string;
  actorId: string;
  actorRole?: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: any;
  clientVisible?: boolean; 
  notifyActor?: boolean;
}

export async function createNotification(params: NotificationParams) {
  try {
    const recipients = new Set<string>();

    const owners = await prisma.user.findMany({
      where: { organizationId: params.organizationId, role: 'OWNER' }
    });
    owners.forEach((o: any) => recipients.add(o.id));

    if (params.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: params.projectId },
        include: { assignees: true }
      });
      if (project) {
        if (project.projectManagerId) recipients.add(project.projectManagerId);
        project.assignees.forEach((a: any) => recipients.add(a.userId));
        
        if (params.clientVisible && project.clientId) {
          recipients.add(project.clientId);
        }
      }
    }

    if (params.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: params.taskId },
        include: { assignees: true, project: true }
      });
      if (task) {
        if (!params.projectId) params.projectId = task.projectId;
        if (task.project?.projectManagerId) recipients.add(task.project.projectManagerId);
        
        task.assignees.forEach((a: any) => recipients.add(a.userId));
        
        if (params.clientVisible && task.project?.clientId) {
          recipients.add(task.project.clientId);
        }
      }
    }

    if (!params.notifyActor) {
      recipients.delete(params.actorId);
    }

    const notificationsToCreate = Array.from(recipients).map(recipientId => ({
      organizationId: params.organizationId,
      projectId: params.projectId || null,
      taskId: params.taskId || null,
      timeEntryId: params.timeEntryId || null,
      recipientId,
      actorId: params.actorId,
      actorRole: params.actorRole || 'UNKNOWN',
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    }));

    if (notificationsToCreate.length === 0) return;

    await prisma.notification.createMany({
      data: notificationsToCreate
    });

    recipients.forEach(userId => {
      emitAppEvent('notification_created', `user:${userId}`, { type: params.type });
    });

  } catch (error) {
    console.error('Failed to create notifications:', error);
  }
}

export async function getMyNotificationsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const notifications = await prisma.notification.findMany({
      where: {
        recipientId: session.userId,
        organizationId: session.organizationId
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return { success: true, notifications };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getUnreadNotificationCountAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const count = await prisma.notification.count({
      where: {
        recipientId: session.userId,
        organizationId: session.organizationId,
        isRead: false
      }
    });

    return { success: true, count };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        recipientId: session.userId
      },
      data: { isRead: true }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    await prisma.notification.updateMany({
      where: {
        recipientId: session.userId,
        organizationId: session.organizationId,
        isRead: false
      },
      data: { isRead: true }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteNotificationAction(notificationId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        recipientId: session.userId
      }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
