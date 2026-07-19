'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Priority, Role } from '@prisma/client';
import { createNotification } from './notifications';
import { triggerEventRules } from './rules';
import { revalidatePath } from 'next/cache';

/**
 * Task Status Management Actions
 */

export async function getTaskStatusesAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const statuses = await prisma.taskStatus.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { order: 'asc' },
    });

    return { success: true, statuses };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch task statuses.' };
  }
}

export async function createTaskStatusAction(name: string, color: string, order: number) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') return { error: 'Unauthorized: Only Owners can manage statuses.' };

    const status = await prisma.taskStatus.create({
      data: {
        name,
        color,
        order,
        organizationId: session.organizationId,
        createdByOwner: true,
      },
    });

    return { success: true, status };
  } catch (error: any) {
    return { error: error.message || 'Failed to create task status.' };
  }
}

export async function updateTaskStatusAction(id: string, name: string, color: string, order: number) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') return { error: 'Unauthorized' };

    const status = await prisma.taskStatus.updateMany({
      where: { id, organizationId: session.organizationId },
      data: { name, color, order },
    });

    if (status.count === 0) return { error: 'Task status not found.' };

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to update task status.' };
  }
}

export async function deleteTaskStatusAction(id: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') return { error: 'Unauthorized' };

    const status = await prisma.taskStatus.deleteMany({
      where: { id, organizationId: session.organizationId },
    });

    if (status.count === 0) return { error: 'Task status not found.' };

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete task status.' };
  }
}


/**
 * Task Management Actions
 */

export async function getTasksAction(projectIdFilter?: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    let whereClause: any = { organizationId };

    if (projectIdFilter) {
      whereClause.projectId = projectIdFilter;
    }

    if (role === 'CLIENT') {
      // Client sees tasks for projects they own
      whereClause.project = { clientId: userId };
    } else if (role === 'MEMBER') {
      // Member sees assigned tasks OR tasks in projects they manage
      whereClause = {
        organizationId,
        OR: [
          { assignees: { some: { userId } } },
          { project: { projectManagerId: userId } },
        ],
      };
      if (projectIdFilter) {
        whereClause.projectId = projectIdFilter;
      }
    } else if (role === 'OWNER') {
      // Owner sees everything (whereClause remains only organizationId and optional project filter)
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: { select: { id: true, name: true, projectManagerId: true, clientId: true } },
        status: true,
        assignees: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, tasks };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch tasks.' };
  }
}

export async function getMyAssignedTasksAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const tasks = await prisma.task.findMany({
      where: {
        organizationId: session.organizationId,
        assignees: { some: { userId: session.userId } },
      },
      include: {
        project: { select: { id: true, name: true } },
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, tasks };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch assigned tasks.' };
  }
}

export async function createTaskAction(
  projectId: string, 
  title: string, 
  description: string | undefined,
  priority: Priority = 'MEDIUM',
  allocatedHours: number | undefined,
  dueDate: string | undefined,
  statusId: string | undefined,
  assigneeIds: string[],
  customFields?: any,
  isRepeated?: boolean,
  repeatSettings?: {
    enabled: boolean;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    startDate: string;
    endDate: string;
  }
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId },
    });

    if (!project) return { error: 'Project not found.' };

    const isOwner = session.role === 'OWNER';
    const isPM = project.projectManagerId === session.userId;
    const isClient = session.role === 'CLIENT' && project.clientId === session.userId;

    if (!isOwner && !isPM && !isClient) {
      return { error: 'Unauthorized to create tasks in this project.' };
    }

    if (!title) return { error: 'Task title is required.' };

    if (isClient) {
      allocatedHours = undefined;
      assigneeIds = [];
      statusId = undefined;
    } else {
      if (allocatedHours === undefined || allocatedHours === null || allocatedHours <= 0) {
        return { error: 'Allocated Hours is required and must be greater than 0.' };
      }
    }

    // Repeated Tasks Creation Logic
    if (repeatSettings?.enabled && repeatSettings.startDate && repeatSettings.endDate) {
      const generateRepeatDates = (start: Date, end: Date, freq: "DAILY" | "WEEKLY" | "MONTHLY"): Date[] => {
        const dates: Date[] = [];
        let current = new Date(start);
        const limit = new Date(end);

        current.setHours(0, 0, 0, 0);
        limit.setHours(0, 0, 0, 0);

        if (current > limit) return [];

        while (current <= limit) {
          dates.push(new Date(current));
          if (freq === "DAILY") {
            current.setDate(current.getDate() + 1);
          } else if (freq === "WEEKLY") {
            current.setDate(current.getDate() + 7);
          } else if (freq === "MONTHLY") {
            current.setMonth(current.getMonth() + 1);
          } else {
            break;
          }
        }
        return dates;
      };

      const start = new Date(repeatSettings.startDate);
      const end = new Date(repeatSettings.endDate);
      const repeatDates = generateRepeatDates(start, end, repeatSettings.frequency);

      if (repeatDates.length > 0) {
        let firstTask: any = null;

        for (const date of repeatDates) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = date.toLocaleDateString('en-US', { month: 'long' });
          const formattedTitle = `${day} ${month} - ${title}`;

          const created = await prisma.task.create({
            data: {
              organizationId: session.organizationId,
              projectId,
              title: formattedTitle,
              description: description || null,
              allocatedHours: allocatedHours || null,
              priority,
              dueDate: date, // Due date is the occurrence day itself
              statusId: statusId || null,
              customFields: customFields || null,
              isRepeated: true,
              assignees: {
                create: assigneeIds.map((userId) => ({
                  userId,
                })),
              },
            },
            include: {
              assignees: {
                include: {
                  user: { select: { id: true, name: true } },
                },
              },
              status: true,
            },
          });

          await createNotification({
            organizationId: session.organizationId,
            projectId: created.projectId,
            taskId: created.id,
            actorId: session.userId,
            actorRole: session.role,
            type: 'task_created',
            title: 'New Task Assigned (Recurring)',
            message: `Recurring task "${created.title}" has been created.`,
            actionUrl: `/workspace/projects/${created.projectId}?taskId=${created.id}`,
            clientVisible: true
          });

          triggerEventRules(session.organizationId, 'create', 'task', created);

          if (!firstTask) {
            firstTask = created;
          }
        }

        return { success: true, task: firstTask };
      }
    }

    // Standard task creation
    if (project.totalAllocatedHours && !isClient) {
      const existingTasks = await prisma.task.aggregate({
        where: { projectId, organizationId: session.organizationId },
        _sum: { allocatedHours: true }
      });
      const currentSum = existingTasks._sum.allocatedHours || 0;
      if (currentSum + (allocatedHours || 0) > project.totalAllocatedHours) {
        return { error: 'Task allocated hours exceed the project’s total allocated hours. Increase project hours or reduce task hours.' };
      }
    }

    const task = await prisma.task.create({
      data: {
        organizationId: session.organizationId,
        projectId,
        title,
        description: description || null,
        allocatedHours: allocatedHours || null,
        priority,
        dueDate: dueDate ? new Date(dueDate) : null,
        statusId: statusId || null,
        customFields: customFields || null,
        isRepeated: isRepeated || false,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        status: true,
      },
    });

    await createNotification({
      organizationId: session.organizationId,
      projectId: task.projectId,
      taskId: task.id,
      actorId: session.userId,
      actorRole: session.role,
      type: 'task_created',
      title: 'New Task Assigned',
      message: `Task "${task.title}" has been created.`,
      actionUrl: `/workspace/projects/${task.projectId}?taskId=${task.id}`,
      clientVisible: true
    });

    triggerEventRules(session.organizationId, 'create', 'task', task);

    return { success: true, task };
  } catch (error: any) {
    return { error: error.message || 'Failed to create task.' };
  }
}

export async function updateTaskAction(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: Priority;
    allocatedHours?: number;
    trackedHours?: number;
    dueDate?: string;
    statusId?: string;
    assigneeIds?: string[];
    customFields?: any;
  }
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId: session.organizationId },
      include: { project: true, assignees: true },
    });

    if (!task) return { error: 'Task not found.' };

    const isOwner = session.role === 'OWNER';
    const isPM = task.project.projectManagerId === session.userId;
    const isClient = session.role === 'CLIENT' && task.project.clientId === session.userId;
    const isAssigned = task.assignees.some(a => a.userId === session.userId);

    // Roles:
    // Owner/PM can update everything.
    // Client can update basic details of tasks in their own project.
    // Member (Assigned) can ONLY update status and trackedHours.
    if (!isOwner && !isPM && !isClient && !isAssigned) {
      return { error: 'Unauthorized to update this task.' };
    }

    if (!isOwner && !isPM && isAssigned) {
      // Member can only update statusId and trackedHours
      const allowedData: any = {};
      if (data.statusId !== undefined) allowedData.statusId = data.statusId;
      if (data.trackedHours !== undefined) allowedData.trackedHours = data.trackedHours;

      if (Object.keys(allowedData).length === 0) {
         return { error: 'Members can only update status and tracked hours.' };
      }

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: allowedData,
        include: { status: true }
      });
      
      await createNotification({
        organizationId: session.organizationId,
        projectId: task.projectId,
        taskId: task.id,
        actorId: session.userId,
        actorRole: session.role,
        type: 'task_updated',
        title: 'Task Updated',
        message: `Member updated task "${task.title}".`,
        actionUrl: `/workspace/projects/${task.projectId}?taskId=${task.id}`,
        clientVisible: true
      });
      
      triggerEventRules(session.organizationId, 'update', 'task', updated, task);

      return { success: true, task: updated };
    }

    // Owner or PM update
    if (data.allocatedHours !== undefined && (data.allocatedHours === null || data.allocatedHours <= 0)) {
      return { error: 'Allocated Hours is required and must be greater than 0.' };
    }

    if (data.allocatedHours !== undefined && data.allocatedHours !== null && task.project.totalAllocatedHours) {
      const existingTasks = await prisma.task.aggregate({
        where: { 
          projectId: task.projectId, 
          organizationId: session.organizationId,
          NOT: { id: taskId }
        },
        _sum: { allocatedHours: true }
      });
      const currentSum = existingTasks._sum.allocatedHours || 0;
      if (currentSum + data.allocatedHours > task.project.totalAllocatedHours) {
        return { error: 'Task allocated hours exceed the project’s total allocated hours.' };
      }
    }

    const updateData: any = {};
    if (isClient) {
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority) updateData.priority = data.priority;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    } else {
      if (data.title) updateData.title = data.title;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.priority) updateData.priority = data.priority;
      if (data.allocatedHours !== undefined) updateData.allocatedHours = data.allocatedHours;
      if (data.trackedHours !== undefined) updateData.trackedHours = data.trackedHours;
      if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
      if (data.statusId !== undefined) updateData.statusId = data.statusId;
      if (data.customFields !== undefined) updateData.customFields = data.customFields;
      
      if (data.assigneeIds) {
        await prisma.taskAssignee.deleteMany({ where: { taskId } });
        if (data.assigneeIds.length > 0) {
          updateData.assignees = {
            create: data.assigneeIds.map(userId => ({ userId }))
          };
        }
      }
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        status: true,
        assignees: { include: { user: { select: { id: true, name: true } } } }
      }
    });

    await createNotification({
      organizationId: session.organizationId,
      projectId: updated.projectId,
      taskId: updated.id,
      actorId: session.userId,
      actorRole: session.role,
      type: 'task_updated',
      title: 'Task Updated',
      message: `Task "${updated.title}" has been updated.`,
      actionUrl: `/workspace/projects/${updated.projectId}?taskId=${updated.id}`,
      clientVisible: true
    });

    triggerEventRules(session.organizationId, 'update', 'task', updated, task);

    return { success: true, task: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update task.' };
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

/**
 * Task Template CRUD Actions
 */

export async function createTaskTemplateAction(name: string, config: any) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can create task templates.' };
    }

    const template = await prisma.taskTemplate.create({
      data: {
        name,
        organizationId: session.organizationId,
        config: config || {},
      },
    });

    return { success: true, template };
  } catch (error: any) {
    return { error: error.message || 'Failed to create task template.' };
  }
}

export async function getTaskTemplatesAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const templates = await prisma.taskTemplate.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, templates };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch task templates.' };
  }
}

export async function deleteTaskTemplateAction(templateId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    await prisma.taskTemplate.deleteMany({
      where: { id: templateId, organizationId: session.organizationId },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete task template.' };
  }
}

export async function updateTaskTemplateAction(templateId: string, config: any) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can update task templates.' };
    }

    if (!templateId || !config) {
      return { error: 'Template ID and configuration details are required.' };
    }

    const template = await prisma.taskTemplate.update({
      where: {
        id: templateId,
        organizationId: session.organizationId,
      },
      data: {
        config: config,
      },
    });

    return { success: true, template };
  } catch (error: any) {
    return { error: error.message || 'Failed to update task template.' };
  }
}

export async function updateTaskCustomFieldsAction(taskId: string, customFields: any) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: "Unauthorized" };
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { customFields },
    });

    revalidatePath("/workspace/tasks");
    return { success: true, task: updated };
  } catch (error: any) {
    console.error("Failed to update task custom fields:", error);
    return { error: "Failed to update task custom fields" };
  }
}
