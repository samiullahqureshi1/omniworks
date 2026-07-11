'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createNotification } from './notifications';
import { Prisma } from '@prisma/client';
import { triggerEventRules } from './rules';

function parseTime(timeStr?: string): { hours: number; minutes: number } {
  if (!timeStr) return { hours: 9, minutes: 0 };
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hours: 9, minutes: 0 };
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return { hours, minutes };
}

export async function createTeamOpsProjectAction(data: {
  name: string;
  department?: string;
  team?: string;
  description?: string;
  notes?: string;
  projectManagerId?: string;
  statusId?: string;
  startDate: string;
  endDate?: string;
  isOngoing: boolean;
  projectBudget?: number;
  totalAllocatedHours?: number;
  priority: Prisma.ProjectCreateInput["priority"];
  assigneeIds: string[];
  customFields?: any;
  isRepeated?: boolean;
  repeatSettings?: {
    enabled: boolean;
    frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  };
  repeatTime?: string;
  tasks?: {
    title: string;
    description?: string;
    priority: Prisma.ProjectCreateInput["priority"];
    statusId?: string;
    assigneeIds: string[];
  }[];
  ruleIds?: string[];
}) {
  try {
    const session = await getSession();
    if (!session || session.role === 'CLIENT') {
      return { error: 'Unauthorized: Clients cannot manage internal operations.' };
    }

    const {
      name,
      department,
      team,
      description,
      notes,
      projectManagerId,
      statusId,
      startDate,
      endDate,
      isOngoing,
      projectBudget,
      totalAllocatedHours,
      priority,
      assigneeIds,
      customFields,
      isRepeated,
      repeatSettings,
      repeatTime,
      tasks,
      ruleIds,
    } = data;

    if (!name || !startDate) {
      return { error: 'Project Name and Start Date are required.' };
    }
    if (totalAllocatedHours === undefined || totalAllocatedHours === null || totalAllocatedHours < 0) {
      return { error: 'Total Allocated Hours is required and must be greater than or equal to 0.' };
    }

    // Repeated Projects Creation Logic
    if (repeatSettings?.enabled && endDate) {
      const generateRepeatDates = (start: Date, end: Date, freq: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY"): Date[] => {
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
          } else if (freq === "QUARTERLY") {
            current.setMonth(current.getMonth() + 3);
          } else if (freq === "YEARLY") {
            current.setFullYear(current.getFullYear() + 1);
          } else {
            break;
          }
        }
        return dates;
      };

      const start = new Date(startDate);
      const end = new Date(endDate);
      const repeatDates = generateRepeatDates(start, end, repeatSettings.frequency);

      if (repeatDates.length > 0) {
        let firstProject: any = null;
        const { hours, minutes } = parseTime(repeatTime);

        for (const date of repeatDates) {
          const dateWithTime = new Date(date);
          dateWithTime.setHours(hours, minutes, 0, 0);

          const day = String(date.getDate()).padStart(2, '0');
          const month = date.toLocaleDateString('en-US', { month: 'long' });
          const formattedName = `${name} - ${day} ${month}`;

          const created = await prisma.project.create({
            data: {
              name: formattedName,
              description: description || null,
              notes: notes || null,
              organizationId: session.organizationId,
              projectManagerId: projectManagerId || null,
              statusId: statusId || null,
              startDate: dateWithTime,
              endDate: dateWithTime,
              isOngoing: false,
              projectBudget: projectBudget || null,
              totalAllocatedHours: totalAllocatedHours || null,
              priority,
              customFields: customFields || null,
              isRepeated: true,
              isInternal: true,
              department: department || null,
              team: team || null,
              repeatTime: repeatTime || null,
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
                  statusId: task.statusId || null,
                  organizationId: session.organizationId,
                  assignees: {
                    create: task.assigneeIds.map((userId) => ({
                      userId,
                    })),
                  },
                })) || [],
              },
              rules: ruleIds && ruleIds.length > 0 ? {
                create: ruleIds.map(ruleId => ({ ruleId }))
              } : undefined,
            },
          });

          await createNotification({
            organizationId: session.organizationId,
            projectId: created.id,
            actorId: session.userId,
            actorRole: session.role,
            type: 'project_created',
            title: 'New Internal Project Created (Recurring)',
            message: `Recurring internal project "${created.name}" has been created.`,
            actionUrl: `/workspace/teamops/${created.id}`,
            clientVisible: false
          });

          triggerEventRules(session.organizationId, 'create', 'project', created);

          if (!firstProject) {
            firstProject = created;
          }
        }

        return { success: true, project: firstProject };
      }
    }

    // Standard Project Creation Logic
    const startObj = new Date(startDate);
    if (!isRepeated) {
      const { hours, minutes } = parseTime(repeatTime);
      startObj.setHours(hours, minutes, 0, 0);
    }
    const endObj = isOngoing || !endDate ? null : new Date(endDate);
    if (endObj && !isRepeated) {
      const { hours, minutes } = parseTime(repeatTime);
      endObj.setHours(hours, minutes, 0, 0);
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        notes: notes || null,
        organizationId: session.organizationId,
        projectManagerId: projectManagerId || null,
        statusId: statusId || null,
        startDate: startObj,
        endDate: endObj,
        isOngoing,
        projectBudget: projectBudget || null,
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        customFields: customFields || null,
        isRepeated: isRepeated || false,
        isInternal: true,
        department: department || null,
        team: team || null,
        repeatTime: repeatTime || null,
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
            statusId: task.statusId || null,
            organizationId: session.organizationId,
            assignees: {
              create: task.assigneeIds.map((userId) => ({
                userId,
              })),
            },
          })) || [],
        },
        rules: ruleIds && ruleIds.length > 0 ? {
          create: ruleIds.map(ruleId => ({ ruleId }))
        } : undefined,
      },
    });

    await createNotification({
      organizationId: session.organizationId,
      projectId: project.id,
      actorId: session.userId,
      actorRole: session.role,
      type: 'project_created',
      title: 'New Internal Project Created',
      message: `Internal project "${project.name}" has been created.`,
      actionUrl: `/workspace/teamops/${project.id}`,
      clientVisible: false
    });

    triggerEventRules(session.organizationId, 'create', 'project', project);

    return { success: true, project };
  } catch (error: any) {
    console.error('Create internal project error:', error);
    return { error: error.message || 'Failed to create internal project.' };
  }
}

export async function updateTeamOpsProjectAction(
  projectId: string,
  data: {
    name: string;
    department?: string;
    team?: string;
    description?: string;
    notes?: string;
    projectManagerId?: string;
    statusId?: string;
    startDate: string;
    endDate?: string;
    isOngoing: boolean;
    projectBudget?: number;
    totalAllocatedHours?: number;
    priority: Prisma.ProjectCreateInput["priority"];
    assigneeIds: string[];
    customFields?: any;
    repeatTime?: string;
    ruleIds?: string[];
  }
) {
  try {
    const session = await getSession();
    if (!session || session.role === 'CLIENT') {
      return { error: 'Unauthorized' };
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId, isInternal: true },
    });
    if (!project) return { error: 'Project not found.' };

    const {
      name,
      department,
      team,
      description,
      notes,
      projectManagerId,
      statusId,
      startDate,
      endDate,
      isOngoing,
      projectBudget,
      totalAllocatedHours,
      priority,
      assigneeIds,
      customFields,
      repeatTime,
      ruleIds,
    } = data;

    if (!name || !startDate) {
      return { error: 'Project Name and Start Date are required.' };
    }
    if (totalAllocatedHours === undefined || totalAllocatedHours === null || totalAllocatedHours < 0) {
      return { error: 'Total Allocated Hours is required and must be greater than or equal to 0.' };
    }

    const startObj = new Date(startDate);
    const { hours, minutes } = parseTime(repeatTime);
    startObj.setHours(hours, minutes, 0, 0);

    const endObj = isOngoing || !endDate ? null : new Date(endDate);
    if (endObj) {
      endObj.setHours(hours, minutes, 0, 0);
    }

    // Delete existing assignees
    await prisma.projectAssignee.deleteMany({ where: { projectId } });

    // Update project
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        name,
        department: department || null,
        team: team || null,
        description: description || null,
        notes: notes || null,
        projectManagerId: projectManagerId || null,
        statusId: statusId || null,
        startDate: startObj,
        endDate: endObj,
        isOngoing,
        projectBudget: projectBudget || null,
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        customFields: customFields || null,
        repeatTime: repeatTime || null,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
      },
    });

    // Update rules
    if (ruleIds) {
      await prisma.projectRule.deleteMany({ where: { projectId } });
      if (ruleIds.length > 0) {
        await prisma.projectRule.createMany({
          data: ruleIds.map(ruleId => ({ projectId, ruleId }))
        });
      }
    }

    await createNotification({
      organizationId: session.organizationId,
      projectId: projectId,
      actorId: session.userId,
      actorRole: session.role,
      type: 'project_updated',
      title: 'Internal Project Updated',
      message: `Internal project "${updated.name}" has been updated.`,
      actionUrl: `/workspace/teamops/${projectId}`,
      clientVisible: false
    });

    triggerEventRules(session.organizationId, 'update', 'project', updated, project);

    return { success: true, project: updated };
  } catch (error: any) {
    console.error('Update internal project error:', error);
    return { error: error.message || 'Failed to update internal project.' };
  }
}

export async function deleteTeamOpsProjectAction(projectId: string) {
  try {
    const session = await getSession();
    if (!session || session.role === 'CLIENT') {
      return { error: 'Unauthorized' };
    }

    const deleted = await prisma.project.deleteMany({
      where: { id: projectId, organizationId: session.organizationId, isInternal: true },
    });

    if (deleted.count === 0) return { error: 'Internal Project not found.' };

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete internal project.' };
  }
}

export async function getTeamOpsProjectsAction() {
  try {
    const session = await getSession();
    if (!session || session.role === 'CLIENT') return { error: 'Unauthorized' };

    const { role, userId, organizationId } = session;

    let whereClause: any = { organizationId, isInternal: true };

    if (role === 'MEMBER') {
      whereClause.OR = [
        { tasks: { some: { assignees: { some: { userId } } } } },
        { projectManagerId: userId },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        status: true,
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
        rules: {
          include: {
            rule: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, projects };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch internal projects.' };
  }
}

export async function createTeamOpsProjectTemplateAction(name: string, config: any) {
  try {
    const session = await getSession();
    if (!session || session.role === 'CLIENT') {
      return { error: 'Unauthorized: Only team members can create templates.' };
    }

    if (!name || !config) {
      return { error: 'Template Name and configuration details are required.' };
    }

    // Set isInternal: true inside config so we know this template belongs to TeamOps Hub
    const updatedConfig = {
      ...config,
      isInternal: true,
    };

    const template = await prisma.projectTemplate.create({
      data: {
        name,
        organizationId: session.organizationId,
        config: updatedConfig,
      },
    });

    return { success: true, template };
  } catch (error: any) {
    return { error: error.message || 'Failed to create internal project template.' };
  }
}

export async function getTeamOpsProjectTemplatesAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const templates = await prisma.projectTemplate.findMany({
      where: { 
        organizationId: session.organizationId,
        // Match templates that have config.isInternal = true
        config: {
          path: ['isInternal'],
          equals: true
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, templates };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch templates.' };
  }
}

export async function deleteTeamOpsProjectTemplateAction(templateId: string) {
  try {
    const session = await getSession();
    if (!session || session.role === 'CLIENT') {
      return { error: 'Unauthorized' };
    }

    await prisma.projectTemplate.deleteMany({
      where: { id: templateId, organizationId: session.organizationId },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete template.' };
  }
}
