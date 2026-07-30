'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { emitAppEvent } from '@/lib/events';
import { createNotification } from './notifications';

// ─── Submit Request ───────────────────────────────────────────────────────────

export async function requestAdditionalHoursAction(
  taskId: string,
  requestedHours: number,
  reason?: string
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
      include: { project: { include: { assignees: true } } },
    });
    if (!task) return { error: 'Task not found.' };

    if (requestedHours <= 0) return { error: 'Requested hours must be greater than 0.' };

    // Check if there's already a pending request from this user for this task
    const existing = await prisma.hoursRequest.findFirst({
      where: { taskId, requestedById: session.userId, status: 'PENDING' },
    });
    if (existing) {
      return { error: 'You already have a pending hours request for this task. Please wait for a response.' };
    }

    const request = await prisma.hoursRequest.create({
      data: {
        organizationId: session.organizationId,
        taskId,
        requestedById: session.userId,
        requestedHours,
        reason: reason || '',
        status: 'PENDING',
      },
    });

    emitAppEvent('hours_request_submitted', `organization:${session.organizationId}`, request);
    if (task.projectId) emitAppEvent('hours_request_submitted', `project:${task.projectId}`, request);

    // Notify Owners + Project Manager
    await createNotification({
      organizationId: session.organizationId,
      projectId: task.projectId,
      taskId,
      actorId: session.userId,
      actorRole: session.role,
      type: 'hours_request_submitted',
      title: '⏱ Additional Hours Requested',
      message: `${session.name} requested ${requestedHours}h more for task "${task.title}".${reason ? ` Reason: ${reason}` : ''}`,
      actionUrl: `/workspace/time`,
      clientVisible: false,
      notifyActor: false,
      metadata: { requestId: request.id, requestedHours, taskTitle: task.title },
    });

    return { success: true, request };
  } catch (error: any) {
    return { error: error.message || 'Failed to submit hours request.' };
  }
}

// ─── Approve Request ─────────────────────────────────────────────────────────

export async function approveHoursRequestAction(requestId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    if (session.role !== 'OWNER' && session.role !== 'MASTER_ADMIN') {
      // Check if they are the project manager
      const req = await prisma.hoursRequest.findFirst({
        where: { id: requestId, organizationId: session.organizationId },
        include: { task: { include: { project: true } } },
      });
      if (!req) return { error: 'Request not found.' };
      if (req.task.project?.projectManagerId !== session.userId) {
        return { error: 'Only Owners or Project Managers can approve hours requests.' };
      }
    }

    const request = await prisma.hoursRequest.findFirst({
      where: { id: requestId, organizationId: session.organizationId },
      include: { task: true },
    });
    if (!request) return { error: 'Request not found.' };
    if (request.status !== 'PENDING') return { error: 'Request is no longer pending.' };

    // Update request status
    const updated = await prisma.hoursRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedById: session.userId,
        reviewedAt: new Date(),
      },
    });

    // Increment task allocated hours in real time
    const updatedTask = await prisma.task.update({
      where: { id: request.taskId },
      data: {
        allocatedHours: {
          increment: request.requestedHours,
        },
      },
    });

    emitAppEvent('hours_request_approved', `organization:${session.organizationId}`, { request: updated, task: updatedTask });
    emitAppEvent('task_hours_updated', `task:${request.taskId}`, updatedTask);
    emitAppEvent('hours_request_approved', `user:${request.requestedById}`, { request: updated, task: updatedTask });

    // Notify the requester
    await createNotification({
      organizationId: session.organizationId,
      projectId: request.task.projectId,
      taskId: request.taskId,
      actorId: session.userId,
      actorRole: session.role,
      type: 'hours_request_approved',
      title: '✅ Hours Request Approved',
      message: `Your request for ${request.requestedHours}h on "${request.task.title}" was approved. New total: ${updatedTask.allocatedHours}h allocated.`,
      actionUrl: `/workspace/time`,
      clientVisible: false,
      notifyActor: false,
      metadata: { requestId, newAllocatedHours: updatedTask.allocatedHours },
    });

    return { success: true, request: updated, task: updatedTask };
  } catch (error: any) {
    return { error: error.message || 'Failed to approve request.' };
  }
}

// ─── Reject Request ───────────────────────────────────────────────────────────

export async function rejectHoursRequestAction(requestId: string, rejectionReason?: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const request = await prisma.hoursRequest.findFirst({
      where: { id: requestId, organizationId: session.organizationId },
      include: { task: { include: { project: true } } },
    });
    if (!request) return { error: 'Request not found.' };

    if (
      session.role !== 'OWNER' &&
      session.role !== 'MASTER_ADMIN' &&
      request.task.project?.projectManagerId !== session.userId
    ) {
      return { error: 'Only Owners or Project Managers can reject hours requests.' };
    }

    if (request.status !== 'PENDING') return { error: 'Request is no longer pending.' };

    const updated = await prisma.hoursRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedById: session.userId,
        reviewedAt: new Date(),
        reason: rejectionReason || request.reason,
      },
    });

    emitAppEvent('hours_request_rejected', `organization:${session.organizationId}`, updated);
    emitAppEvent('hours_request_rejected', `user:${request.requestedById}`, updated);

    // Notify the requester
    await createNotification({
      organizationId: session.organizationId,
      projectId: request.task.projectId,
      taskId: request.taskId,
      actorId: session.userId,
      actorRole: session.role,
      type: 'hours_request_rejected',
      title: '❌ Hours Request Rejected',
      message: `Your request for ${request.requestedHours}h on "${request.task.title}" was rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`,
      actionUrl: `/workspace/time`,
      clientVisible: false,
      notifyActor: false,
      metadata: { requestId, requestedHours: request.requestedHours },
    });

    return { success: true, request: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to reject request.' };
  }
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getMyHoursRequestsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const requests = await prisma.hoursRequest.findMany({
      where: { requestedById: session.userId, organizationId: session.organizationId },
      include: {
        task: { select: { id: true, title: true, allocatedHours: true, trackedHours: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, requests };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch your requests.' };
  }
}

export async function getPendingHoursRequestsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Only owners, master admins, or project managers can see pending requests
    if (session.role !== 'OWNER' && session.role !== 'MASTER_ADMIN') {
      // Get managed project IDs
      const managedProjects = await prisma.project.findMany({
        where: { projectManagerId: session.userId, organizationId: session.organizationId },
        select: { id: true },
      });
      const projectIds = managedProjects.map((p: any) => p.id);

      const requests = await prisma.hoursRequest.findMany({
        where: {
          organizationId: session.organizationId,
          status: 'PENDING',
          task: { projectId: { in: projectIds } },
        },
        include: {
          task: { select: { id: true, title: true, allocatedHours: true, trackedHours: true, projectId: true } },
          requestedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return { success: true, requests };
    }

    const requests = await prisma.hoursRequest.findMany({
      where: { organizationId: session.organizationId, status: 'PENDING' },
      include: {
        task: { select: { id: true, title: true, allocatedHours: true, trackedHours: true, projectId: true } },
        requestedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, requests };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch pending requests.' };
  }
}
