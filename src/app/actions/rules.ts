'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createNotification } from './notifications';

export async function getRulesAction() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const rules = await prisma.rule.findMany({
      where: { organizationId: session.organizationId },
      include: {
        projects: {
          include: {
            project: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, rules };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch rules.' };
  }
}

export async function getRuleLogsAction() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const logs = await prisma.ruleLog.findMany({
      where: {
        rule: { organizationId: session.organizationId }
      },
      include: {
        rule: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } }
      },
      orderBy: { executedAt: 'desc' },
      take: 50
    });

    return { success: true, logs };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch rule logs.' };
  }
}

export async function createRuleAction(data: {
  name: string;
  description?: string;
  frequency: string;
  reminderTime: string;
  actionType: string;
  recipients: string[];
  attachedProjectIds?: string[];
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can manage rules.' };
    }

    const { name, description, frequency, reminderTime, actionType, recipients, attachedProjectIds } = data;

    if (!name || !frequency || !reminderTime || !actionType) {
      return { error: 'Required fields missing.' };
    }

    const rule = await prisma.rule.create({
      data: {
        name,
        description: description || null,
        frequency,
        reminderTime,
        actionType,
        recipients: recipients || [],
        organizationId: session.organizationId,
        projects: attachedProjectIds ? {
          create: attachedProjectIds.map(projectId => ({
            projectId
          }))
        } : undefined
      }
    });

    return { success: true, rule };
  } catch (error: any) {
    return { error: error.message || 'Failed to create rule.' };
  }
}

export async function updateRuleAction(
  ruleId: string,
  data: {
    name?: string;
    description?: string;
    frequency?: string;
    reminderTime?: string;
    actionType?: string;
    recipients?: string[];
    attachedProjectIds?: string[];
    isActive?: boolean;
  }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const rule = await prisma.rule.findFirst({
      where: { id: ruleId, organizationId: session.organizationId }
    });

    if (!rule) return { error: 'Rule not found.' };

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.reminderTime !== undefined) updateData.reminderTime = data.reminderTime;
    if (data.actionType !== undefined) updateData.actionType = data.actionType;
    if (data.recipients !== undefined) updateData.recipients = data.recipients;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.attachedProjectIds !== undefined) {
      await prisma.projectRule.deleteMany({ where: { ruleId } });
      updateData.projects = {
        create: data.attachedProjectIds.map(projectId => ({
          projectId
        }))
      };
    }

    const updated = await prisma.rule.update({
      where: { id: ruleId },
      data: updateData
    });

    return { success: true, rule: updated };
  } catch (error: any) {
    return { error: error.message || 'Failed to update rule.' };
  }
}

export async function deleteRuleAction(ruleId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    await prisma.rule.deleteMany({
      where: { id: ruleId, organizationId: session.organizationId }
    });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete rule.' };
  }
}

export async function executeRuleAction(ruleId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized' };
    }

    const rule = await prisma.rule.findFirst({
      where: { id: ruleId, organizationId: session.organizationId },
      include: {
        projects: {
          include: {
            project: {
              include: {
                assignees: true,
                organization: true
              }
            }
          }
        }
      }
    });

    if (!rule) return { error: 'Rule not found.' };
    if (!rule.isActive) return { error: 'Cannot execute an inactive rule.' };

    const attachedProjects = rule.projects.map(pr => pr.project);

    if (attachedProjects.length === 0) {
      // Log execution but with status SUCCESSFUL with message "No attached projects"
      await prisma.ruleLog.create({
        data: {
          ruleId,
          sentTo: 'None (No attached projects)',
          status: 'SUCCESSFUL',
          error: 'No projects attached to this rule.'
        }
      });
      return { success: true, message: 'Rule executed. No projects were attached.' };
    }

    const recipientsList = rule.recipients as string[];
    let executionLogs = [];

    for (const project of attachedProjects) {
      let recipientUserIds: string[] = [];

      // Resolve targets based on selected roles
      if (recipientsList.includes('PROJECT_MANAGER') && project.projectManagerId) {
        recipientUserIds.push(project.projectManagerId);
      }
      if (recipientsList.includes('PROJECT_OWNER') && project.organization.ownerUserId) {
        recipientUserIds.push(project.organization.ownerUserId);
      }
      if (recipientsList.includes('ASSIGNED_USER')) {
        project.assignees.forEach(a => recipientUserIds.push(a.userId));
      }

      // De-duplicate
      recipientUserIds = Array.from(new Set(recipientUserIds));

      try {
        if (rule.actionType === 'SEND_REMINDER' || rule.actionType === 'SEND_NOTIFICATION') {
          // Send notification via database
          for (const userId of recipientUserIds) {
            await createNotification({
              organizationId: session.organizationId,
              projectId: project.id,
              actorId: session.userId,
              actorRole: session.role,
              type: 'project_created', // default indicator type
              title: `Reminder: ${rule.name}`,
              message: rule.description || `Automation reminder: Please update project "${project.name}" progress report.`,
              actionUrl: `/workspace/projects/${project.id}`,
              clientVisible: true
            });
          }
        } else if (rule.actionType === 'CREATE_TASK') {
          // Automatically create task under project
          await prisma.task.create({
            data: {
              organizationId: session.organizationId,
              projectId: project.id,
              title: `Rule Task: ${rule.name}`,
              description: rule.description || 'Task created automatically by system automation rules.',
              priority: 'MEDIUM',
              allocatedHours: 1.0,
              assignees: recipientUserIds.length > 0 ? {
                create: recipientUserIds.map(userId => ({ userId }))
              } : undefined
            }
          });
        }

        // Log successful execution per project
        const log = await prisma.ruleLog.create({
          data: {
            ruleId,
            projectId: project.id,
            sentTo: recipientsList.join(', ') || 'No Recipients Specified',
            status: 'SUCCESSFUL'
          }
        });
        executionLogs.push(log);
      } catch (err: any) {
        const log = await prisma.ruleLog.create({
          data: {
            ruleId,
            projectId: project.id,
            sentTo: recipientsList.join(', '),
            status: 'FAILED',
            error: err.message || 'Execution error.'
          }
        });
        executionLogs.push(log);
      }
    }

    return { success: true, executionLogs };
  } catch (error: any) {
    return { error: error.message || 'Failed to execute rule.' };
  }
}
