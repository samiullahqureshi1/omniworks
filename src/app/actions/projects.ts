'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { ProjectStatus, Priority, Role } from '@prisma/client';

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
    const existing = await prisma.user.findUnique({
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

export async function createProjectAction(data: {
  name: string;
  description?: string;
  notes?: string;
  clientId?: string;
  projectManagerId?: string;
  status: ProjectStatus;
  startDate: string;
  endDate?: string;
  isOngoing: boolean;
  totalAllocatedHours?: number;
  priority: Priority;
  assigneeIds: string[];
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
      totalAllocatedHours,
      priority,
      assigneeIds,
    } = data;

    if (!name || !startDate) {
      return { error: 'Project Name and Start Date are required.' };
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
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
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
    status: ProjectStatus;
    startDate: string;
    endDate?: string;
    isOngoing: boolean;
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
      totalAllocatedHours,
      priority,
      assigneeIds,
    } = data;

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
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
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

// Tasks Actions
export async function createTaskAction(
  projectId: string, 
  title: string, 
  description: string | undefined,
  priority: Priority = 'MEDIUM',
  allocatedHours: number | undefined,
  assigneeIds: string[]
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Verify project belongs to organization
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId },
    });

    if (!project) return { error: 'Project not found.' };

    // Permissions check:
    // Owner can create tasks.
    // Project PM can create tasks.
    // Client can create tasks in their own project.
    const isOwner = session.role === 'OWNER';
    const isPM = project.projectManagerId === session.userId;
    const isClient = project.clientId === session.userId && session.role === 'CLIENT';

    if (!isOwner && !isPM && !isClient) {
      return { error: 'Unauthorized to create tasks in this project.' };
    }

    if (!title) return { error: 'Task title is required.' };

    const task = await prisma.task.create({
      data: {
        organizationId: session.organizationId,
        projectId,
        title,
        description: description || null,
        allocatedHours: allocatedHours || null,
        priority,
        status: 'TODO',
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        assignees: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return { success: true, task };
  } catch (error: any) {
    return { error: error.message || 'Failed to create task.' };
  }
}

export async function updateTaskStatusAction(taskId: string, status: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
      },
    });

    if (!task) return { error: 'Task not found.' };

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
    });

    return { success: true, task: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update task status.' };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
      },
      include: {
        project: true,
      },
    });

    if (!task) return { error: 'Task not found.' };

    const isOwner = session.role === 'OWNER';
    const isPM = task.project.projectManagerId === session.userId;

    if (!isOwner && !isPM) {
      return { error: 'Unauthorized to delete this task.' };
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete task.' };
  }
}
