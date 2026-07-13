'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createNotification } from './notifications';
import {  Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/lib/auth'; // Ensure this is imported

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { triggerEventRules } from './rules';

// Quick Client Creation inside project form:
// Owner can quickly create a Client user directly during project creation/editing.
export async function quickCreateClientAction(name: string, email: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can create clients.' };
    }

    if (!name || !email) {
      return { error: 'Name and email are required.' };
    }

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { email },
    });
    if (existing) {
      return { error: 'User with this email already exists.' };
    }

    const rawPassword = crypto.randomBytes(4).toString('hex');
    const passwordHash = await hashPassword(rawPassword);

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

    // Send email with credentials
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"OmniWork" <${process.env.EMAIL_USER}>`,
          to: email,
          replyTo: process.env.EMAIL_USER,
          subject: 'Welcome to OmniWork - Your Client Account Details',
          html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to OmniWork</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f7f6; padding: 40px 20px; margin: 0; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden;">
    <div style="background-color: #2563eb; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">OmniWork</h1>
      <p style="color: #bfdbfe; margin-top: 5px; font-size: 16px;">Client Portal Access</p>
    </div>
    
    <div style="padding: 40px 30px;">
      <h2 style="color: #1e293b; margin-top: 0; font-size: 22px;">Hello ${name},</h2>
      <p style="font-size: 16px; line-height: 1.6; color: #475569;">
        A client account has been created for you on OmniWork. You can now log in to view project updates, track progress, and communicate directly with the team.
      </p>
      
      <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #e2e8f0;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Your Login Credentials</h3>
        <p style="margin: 15px 0 5px 0; font-size: 15px;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a></p>
        <p style="margin: 0; font-size: 15px;"><strong>Password:</strong> <span style="background-color: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-family: monospace; letter-spacing: 1px;">${rawPassword}</span></p>
      </div>
      
      <p style="color: #64748b; font-size: 15px; line-height: 1.6;">
        For your security, we strongly recommend logging in and updating your password from your profile settings immediately.
      </p>
      
      <div style="text-align: center; margin-top: 40px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Access Your Portal</a>
      </div>
    </div>
    
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 13px; margin: 0;">
        &copy; ${new Date().getFullYear()} OmniWork. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
      }
    }

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

    const defaultStatus = await prisma.projectStatus.findFirst({
      where: { organizationId: session.organizationId },
      orderBy: { order: 'asc' }
    });

    const project = await prisma.project.create({
      data: {
        name,
        organizationId: session.organizationId,
        startDate: new Date(),
        statusId: defaultStatus?.id || null,
        priority: 'MEDIUM',
      },
    });
    triggerEventRules(session.organizationId, 'create', 'project', project);
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
    time?: string;
  };
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
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can create projects.' };
    }

    const {
      name,
      description,
      notes,
      clientId,
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

        for (const date of repeatDates) {
          const day = String(date.getDate()).padStart(2, '0');
          const month = date.toLocaleDateString('en-US', { month: 'long' });
          const formattedName = `${name} - ${day} ${month}`;

          const created = await prisma.project.create({
            data: {
              name: formattedName,
              description: description || null,
              notes: notes || null,
              organizationId: session.organizationId,
              clientId: clientId || null,
              projectManagerId: projectManagerId || null,
              statusId: statusId || null,
              startDate: date,
              endDate: date, // For single instances, end date is the occurrence day itself
              isOngoing: false,
              projectBudget: projectBudget || null,
              totalAllocatedHours: totalAllocatedHours || null,
              priority,
              customFields: customFields || null,
              isRepeated: true,
              repeatTime: repeatSettings?.time || null,
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
            title: 'New Project Created (Recurring)',
            message: `Recurring Project "${created.name}" has been created.`,
            actionUrl: `/workspace/projects/${created.id}`,
            clientVisible: true
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
    const project = await prisma.project.create({
      data: {
        name,
        description: description || null,
        notes: notes || null,
        organizationId: session.organizationId,
        clientId: clientId || null,
        projectManagerId: projectManagerId || null,
        statusId: statusId || null,
        startDate: new Date(startDate),
        endDate: isOngoing || !endDate ? null : new Date(endDate),
        isOngoing,
        projectBudget: projectBudget || null,
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        customFields: customFields || null,
        isRepeated: isRepeated || false,
        repeatTime: repeatSettings?.time || null,
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
      title: 'New Project Created',
      message: `Project "${project.name}" has been created.`,
      actionUrl: `/workspace/projects/${project.id}`,
      clientVisible: true
    });

    triggerEventRules(session.organizationId, 'create', 'project', project);

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
    statusId?: string;
    startDate: string;
    endDate?: string;
    isOngoing: boolean;
    projectBudget?: number;
    totalAllocatedHours?: number;
    priority: Prisma.ProjectCreateInput["priority"];
    assigneeIds: string[];
    customFields?: any;
    ruleIds?: string[];
    tasks?: any[];
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

    // Check permissions: OWNER has full access, MEMBER can edit their managed projects, CLIENT cannot edit projects
    if (session.role === 'CLIENT') {
      return { error: 'Unauthorized: Clients cannot edit projects.' };
    } else if (session.role === 'MEMBER') {
      if (project.projectManagerId !== session.userId) {
        return { error: 'Unauthorized: Access denied.' };
      }
    } else if (session.role !== 'OWNER') {
      return { error: 'Unauthorized.' };
    }

    const {
      name,
      description,
      notes,
      clientId,
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
      ruleIds,
      tasks,
    } = data;

    if (totalAllocatedHours === undefined || totalAllocatedHours === null || totalAllocatedHours < 0) {
      return { error: 'Total Allocated Hours is required and must be greater than or equal to 0.' };
    }

    // Delete existing assignees, then add new ones
    await prisma.projectAssignee.deleteMany({
      where: { projectId },
    });

    // Delete existing attached rules
    await prisma.projectRule.deleteMany({
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
        statusId: statusId || null,
        startDate: new Date(startDate),
        endDate: isOngoing || !endDate ? null : new Date(endDate),
        isOngoing,
        projectBudget: projectBudget || null,
        totalAllocatedHours: totalAllocatedHours || null,
        priority,
        customFields: customFields || null,
        assignees: {
          create: assigneeIds.map((userId) => ({
            userId,
          })),
        },
        rules: ruleIds && ruleIds.length > 0 ? {
          create: ruleIds.map(ruleId => ({ ruleId }))
        } : undefined,
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

    triggerEventRules(session.organizationId, 'update', 'project', updated, project);

    return { success: true, project: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update project.' };
  }
}

export async function updateProjectStatusAction(projectId: string, statusId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    // Check project tenant isolation
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId },
    });

    if (!project) return { error: 'Project not found.' };

    if (session.role === 'CLIENT') {
      return { error: 'Unauthorized: Clients cannot update project status.' };
    }
    if (session.role === 'MEMBER' && project.projectManagerId !== session.userId) {
      return { error: 'Unauthorized: Access denied.' };
    }

    // Update status
    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { statusId },
    });

    triggerEventRules(session.organizationId, 'update', 'project', updated, project);

    return { success: true, project: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update project status.' };
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

    // Base query options ensuring organization isolation and client-facing only
    let whereClause: any = { organizationId, isInternal: false };

    if (role === 'CLIENT') {
      // Client can only access their own assigned projects
      whereClause.clientId = userId;
    } else if (role === 'MEMBER') {
      // Member can see projects where they are assigned to at least one task OR projects where they are PM
      whereClause.OR = [
        { tasks: { some: { assignees: { some: { userId } } } } },
        { projectManagerId: userId },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        status: true,
        client: {
          select: { id: true, name: true, email: true },
        },
        projectManager: {
          select: { id: true, name: true, email: true },
        },
        rules: true,
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

export async function createProjectTemplateAction(name: string, config: any) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can create project templates.' };
    }

    if (!name || !config) {
      return { error: 'Template Name and configuration details are required.' };
    }

    const template = await prisma.projectTemplate.create({
      data: {
        name,
        organizationId: session.organizationId,
        config: config,
      },
    });

    return { success: true, template };
  } catch (error: any) {
    return { error: error.message || 'Failed to create project template.' };
  }
}

export async function getProjectTemplatesAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const templates = await prisma.projectTemplate.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, templates };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch project templates.' };
  }
}

export async function deleteProjectTemplateAction(templateId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can delete project templates.' };
    }

    await prisma.projectTemplate.deleteMany({
      where: { id: templateId, organizationId: session.organizationId },
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete project template.' };
  }
}

// Tasks Actions moved to actions/tasks.ts

export async function updateProjectDueDateAction(projectId: string, endDate: string | null, isOngoing?: boolean) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: "Unauthorized" };
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId }
    });
    if (!project) return { error: "Project not found or access denied." };

    if (session.role === 'CLIENT') {
      return { error: 'Unauthorized: Clients cannot update project due date.' };
    }
    if (session.role === 'MEMBER' && project.projectManagerId !== session.userId) {
      return { error: 'Unauthorized: Access denied.' };
    }

    const data: any = { endDate: endDate ? new Date(endDate) : null };
    if (isOngoing !== undefined) {
      data.isOngoing = isOngoing;
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    revalidatePath("/workspace/projects");
    return { success: true, project: updated };
  } catch (error: any) {
    console.error("Failed to update project due date:", error);
    return { error: "Failed to update project due date" };
  }
}

export async function updateProjectCustomFieldsAction(projectId: string, customFields: any) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: "Unauthorized" };
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId }
    });
    if (!project) return { error: "Project not found or access denied." };

    if (session.role === 'CLIENT') {
      return { error: 'Unauthorized: Clients cannot update project custom fields.' };
    }
    if (session.role === 'MEMBER' && project.projectManagerId !== session.userId) {
      return { error: 'Unauthorized: Access denied.' };
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { customFields },
    });

    revalidatePath("/workspace/projects");
    return { success: true, project: updated };
  } catch (error: any) {
    console.error("Failed to update project custom fields:", error);
    return { error: "Failed to update project custom fields" };
  }
}

export async function updateProjectPriorityAction(projectId: string, priority: string) {
  try {
    const session = await getSession();
    if (!session?.userId) {
      return { error: "Unauthorized" };
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId: session.organizationId }
    });
    if (!project) return { error: "Project not found or access denied." };

    if (session.role === 'CLIENT') {
      return { error: 'Unauthorized: Clients cannot update project priority.' };
    }
    if (session.role === 'MEMBER' && project.projectManagerId !== session.userId) {
      return { error: 'Unauthorized: Access denied.' };
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: { priority: priority as any },
    });

    revalidatePath("/workspace/projects");
    return { success: true, project: updated };
  } catch (error: any) {
    console.error("Failed to update project priority:", error);
    return { error: "Failed to update project priority" };
  }
}
