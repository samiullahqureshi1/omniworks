'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Milestone Server Actions
 */

export async function getMilestonesAction(projectId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    // Verify project access
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) return { error: 'Project not found.' };

    const whereClause: any = { projectId, organizationId };

    // Clients only see client-visible milestones
    if (role === 'CLIENT') {
      whereClause.clientVisible = true;
    }

    const milestones = await prisma.milestone.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { id: true, name: true } },
        tasks: {
          select: { id: true, title: true, status: { select: { name: true, color: true } } },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });

    return { success: true, milestones };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch milestones.' };
  }
}

export async function createMilestoneAction(
  projectId: string,
  data: {
    title: string;
    description?: string;
    dueDate?: string;
    status?: string;
    progress?: number;
    clientVisible?: boolean;
    autoComplete?: boolean;
  }
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) return { error: 'Project not found.' };

    const isOwner = role === 'OWNER';
    const isPM = project.projectManagerId === userId;

    if (!isOwner && !isPM) {
      return { error: 'Only Owners and Project Managers can create milestones.' };
    }

    if (!data.title?.trim()) {
      return { error: 'Milestone title is required.' };
    }

    const milestone = await prisma.milestone.create({
      data: {
        organizationId,
        projectId,
        title: data.title.trim(),
        description: data.description || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || 'NOT_STARTED',
        progress: data.progress ?? 0,
        clientVisible: data.clientVisible ?? false,
        autoComplete: data.autoComplete ?? false,
        createdById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        tasks: { select: { id: true, title: true } },
      },
    });

    revalidatePath(`/workspace/projects/${projectId}`);
    return { success: true, milestone };
  } catch (error: any) {
    return { error: error.message || 'Failed to create milestone.' };
  }
}

export async function updateMilestoneAction(
  milestoneId: string,
  data: {
    title?: string;
    description?: string;
    dueDate?: string;
    status?: string;
    progress?: number;
    clientVisible?: boolean;
    autoComplete?: boolean;
  }
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, organizationId },
      include: { project: true },
    });
    if (!milestone) return { error: 'Milestone not found.' };

    const isOwner = role === 'OWNER';
    const isPM = milestone.project.projectManagerId === userId;

    if (!isOwner && !isPM) {
      return { error: 'Only Owners and Project Managers can update milestones.' };
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.progress !== undefined) {
      updateData.progress = Math.min(100, Math.max(0, data.progress));
      // Auto-complete: if progress reaches 100 and autoComplete is on, mark completed
      if (updateData.progress === 100 && milestone.autoComplete) {
        updateData.status = 'COMPLETED';
        updateData.completedAt = new Date();
      }
    }
    if (data.clientVisible !== undefined) updateData.clientVisible = data.clientVisible;
    if (data.autoComplete !== undefined) updateData.autoComplete = data.autoComplete;

    // If manually setting status to COMPLETED, record completedAt
    if (data.status === 'COMPLETED' && milestone.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== 'COMPLETED') {
      updateData.completedAt = null;
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true } },
        tasks: { select: { id: true, title: true, status: { select: { name: true, color: true } } } },
      },
    });

    revalidatePath(`/workspace/projects/${milestone.projectId}`);
    return { success: true, milestone: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update milestone.' };
  }
}

export async function deleteMilestoneAction(milestoneId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, organizationId },
      include: { project: true },
    });
    if (!milestone) return { error: 'Milestone not found.' };

    const isOwner = role === 'OWNER';
    const isPM = milestone.project.projectManagerId === userId;

    if (!isOwner && !isPM) {
      return { error: 'Only Owners and Project Managers can delete milestones.' };
    }

    // Unlink tasks before deleting (set milestoneId to null)
    await prisma.task.updateMany({
      where: { milestoneId, organizationId },
      data: { milestoneId: null },
    });

    await prisma.milestone.delete({
      where: { id: milestoneId },
    });

    revalidatePath(`/workspace/projects/${milestone.projectId}`);
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete milestone.' };
  }
}
