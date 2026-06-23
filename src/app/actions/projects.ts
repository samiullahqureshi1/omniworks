'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createNotification } from './notifications';
import { Priority, Role } from '@prisma/client';
import { hashPassword } from '@/lib/auth'; // Ensure this is imported

// Quick Client Creation inside project form:
// Owner can quickly create a Client user directly during project creation/editing.
export async function quickCreateClientAction(name: string, email: string, password?: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can create clients.' };
    }

    if (!name || !email || !password) {
      return { error: 'Name, email, and password are required.' };
    }

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email },
    });
    if (existing) {
      return { error: 'User with this email already exists.' };
    }

    const passwordHash = await hashPassword(password);

    // Create client user
    const clientUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'CLIENT',
        organizationId: session.organizationId,
      },
    });

    return { success: true, client: clientUser };
  } catch (error: any) {
    return { error: error.message || 'Failed to create client.' };
  }
}

export async function quickCreateProjectAction(name: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can create projects.' };
    }
    if (!name) return { error: 'Project name is required.' };

    const project = await prisma.project.create({
      data: {
        name,
        organizationId: session.organizationId,
        startDate: new Date(),
        status: 'PLANNING',
        priority: 'MEDIUM',
      },
    });
    return { success: true, project };
  } catch (error: any) {
    return { error: error.message || 'Failed to quickly create project.' };
  }
}

export async function createProjectAction(data: {
  name: string;
  description?: string;
  notes?: string;
  clientId?: string;
  projectManagerId?: string;
status: string;
  startDate: string;
  endDate?: string;
  isOngoing: boolean;
  projectBudget?: number;
  totalAllocatedHours?: number;
  priority: Priority;
  assigneeIds: string[];
  tasks?: {
    title: string;
    description?: string;
    priority: Priority;
    status: string;
    assigneeIds: string[];
  }[];
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can create projects.' };
    }

    const {
      name,
      description,
      notes,
      clientId,
      projectManagerId,
      status,
      startDate,
      endDate,
      isOngoing,
      projectBudget,
      totalAllocatedHours,
      priority,
      assigneeIds,
      tasks,
    } = data;

    if (!name || !startDate) {
      return { error: 'Project Name and Start Date are required.' };
    }
    if (totalAllocatedHours === undefined || totalAllocatedHours === null || totalAllocatedHours < 0) {
      return { error: 'Total Allocated Hours is required and must be greater than or equal to 0.' };
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        notes: notes || null,
        organizationId: session.organizationId,
        clientId: clientId || null,
        projectManagerId: projectManagerId || null,
        status,
        startDate: new Date(startDate),
        endDate: isOngoing || !endDate ? null : new Date(endDate),
        isOngoing,
        projectBudget: projectBudget || null,
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
        tasks: {
          create: tasks?.map((task) => ({
            title: task.title,
            description: task.description || null,
            priority: task.priority,
            organizationId: session.organizationId,
            assignees: {
              create: task.assigneeIds.map((userId) => ({
                userId,
              })),
            },
          })) || [],
        },
      },
    });

    await createNotification({
      organizationId: session.organizationId,
      projectId: project.id,
      actorId: session.userId,
      actorRole: session.role,
      type: 'project_created',
      title: 'New Project Created',
      message: `Project "${project.name}" has been created.`,
      actionUrl: `/workspace/projects/${project.id}`,
      clientVisible: true
    });

    return { success: true, project };
  } catch (error: any) {
    console.error('Create project error:', error);
    return { error: error.message || 'Failed to create project.' };
  }
}

export async function updateProjectAction(
  projectId: string,
  data: {
    name: string;
    description?: string;
    notes?: string;
    clientId?: string;
    projectManagerId?: string;
status: string;
    startDate: string;
    endDate?: string;
    isOngoing: boolean;
    projectBudget?: number;
    totalAllocatedHours?: number;
    priority: Priority;
    assigneeIds: string[];
  }
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Find project to verify tenant isolation
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId },
    });

    if (!project) return { error: 'Project not found.' };

    // Only Owner can edit project settings (PMs can manage tasks only)
    if (session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only owners can update project settings.' };
    }

    const {
      name,
      description,
      notes,
      clientId,
      projectManagerId,
      status,
      startDate,
      endDate,
      isOngoing,
      projectBudget,
      totalAllocatedHours,
      priority,
      assigneeIds,
    } = data;

    if (totalAllocatedHours === undefined || totalAllocatedHours === null || totalAllocatedHours < 0) {
      return { error: 'Total Allocated Hours is required and must be greater than or equal to 0.' };
    }

    // Delete existing assignees, then add new ones
    await prisma.projectAssignee.deleteMany({
      where: { projectId },
    });

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        description: description || null,
        notes: notes || null,
        clientId: clientId || null,
        projectManagerId: projectManagerId || null,
        status,
        startDate: new Date(startDate),
        endDate: isOngoing || !endDate ? null : new Date(endDate),
        isOngoing,
        projectBudget: projectBudget || null,
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
    });

    await createNotification({
      organizationId: session.organizationId,
      projectId: updated.id,
      actorId: session.userId,
      actorRole: session.role,
      type: 'project_updated',
      title: 'Project Updated',
      message: `Project "${updated.name}" details have been updated.`,
      actionUrl: `/workspace/projects/${updated.id}`,
      clientVisible: true
    });

    return { success: true, project: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update project.' };
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const deleted = await prisma.project.deleteMany({
      where: { id: projectId, organizationId: session.organizationId },
    });

    if (deleted.count === 0) return { error: 'Project not found.' };

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete project.' };
  }
}

export async function getProjectsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    // Base query options ensuring organization isolation
    let whereClause: any = { organizationId };

    if (role === 'CLIENT') {
      // Client can only access their own assigned projects
      whereClause.clientId = userId;
    } else if (role === 'MEMBER') {
      // Member can see assigned projects OR projects where they are PM
      whereClause.OR = [
        { assignees: { some: { userId } } },
        { projectManagerId: userId },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
        projectManager: {
          select: { id: true, name: true, email: true },
        },
        assignees: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        tasks: {
          include: {
            assignees: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, projects };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch projects.' };
  }
}

// Tasks Actions moved to actions/tasks.ts
