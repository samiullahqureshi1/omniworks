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
  triggerField?: string;
  triggerOperator?: string;
  triggerValue?: string;
  actionType: string;
  actionRecipients?: string[];
  attachedProjectIds?: string[];
  // Legacy fields
  frequency?: string;
  reminderTime?: string;
  recipients?: string[];
}) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return { error: 'Unauthorized: Only Owners can manage rules.' };
    }

    const {
      name,
      description,
      triggerField = 'Title',
      triggerOperator = 'Contains',
      triggerValue = 'urgent',
      actionType,
      actionRecipients,
      attachedProjectIds,
      frequency,
      reminderTime,
      recipients,
    } = data;

    if (!name || !actionType) {
      return { error: 'Required fields missing.' };
    }

    const resolvedRecipients = actionRecipients || recipients || [];

    const rule = await prisma.rule.create({
      data: {
        name,
        description: description || null,
        triggerField,
        triggerOperator,
        triggerValue,
        actionType,
        frequency: frequency || null,
        reminderTime: reminderTime || null,
        recipients: resolvedRecipients,
        actionRecipients: resolvedRecipients,
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
    triggerField?: string;
    triggerOperator?: string;
    triggerValue?: string;
    actionType?: string;
    actionRecipients?: string[];
    attachedProjectIds?: string[];
    isActive?: boolean;
    // Legacy fields
    frequency?: string;
    reminderTime?: string;
    recipients?: string[];
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
    if (data.triggerField !== undefined) updateData.triggerField = data.triggerField;
    if (data.triggerOperator !== undefined) updateData.triggerOperator = data.triggerOperator;
    if (data.triggerValue !== undefined) updateData.triggerValue = data.triggerValue;
    if (data.actionType !== undefined) updateData.actionType = data.actionType;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.reminderTime !== undefined) updateData.reminderTime = data.reminderTime;

    const resolvedRecipients = data.actionRecipients || data.recipients;
    if (resolvedRecipients !== undefined) {
      updateData.actionRecipients = resolvedRecipients;
      updateData.recipients = resolvedRecipients;
    }

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

// Deprecated executeRuleAction - Kept for compatibility but matches event rule execution
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
            project: true
          }
        }
      }
    });

    if (!rule) return { error: 'Rule not found.' };
    
    // Trigger simulation run on first project
    if (rule.projects.length > 0) {
      const proj = rule.projects[0].project;
      await triggerEventRules(session.organizationId, 'update', 'project', proj);
      return { success: true, message: 'Triggered automation simulation on project.' };
    }

    return { success: true, message: 'No projects attached to run simulation.' };
  } catch (error: any) {
    return { error: error.message || 'Failed to execute rule.' };
  }
}

// Event-Based Rules Automation Engine
export async function triggerEventRules(
  organizationId: string,
  eventType: 'create' | 'update',
  targetType: 'project' | 'task',
  entityData: any
) {
  try {
    const rules = await prisma.rule.findMany({
      where: { organizationId, isActive: true },
      include: {
        projects: true
      }
    });

    for (const rule of rules) {
      // 1. Check project filter
      const attachedProjectIds = rule.projects.map(p => p.projectId);
      const projectId = targetType === 'task' ? entityData.projectId : entityData.id;

      if (attachedProjectIds.length > 0 && !attachedProjectIds.includes(projectId)) {
        continue;
      }

      // 2. Evaluate IF condition
      const isMatch = await evaluateRuleCondition(rule, targetType, entityData);
      if (!isMatch) continue;

      // 3. Execute THEN action
      let recipientUserIds: string[] = [];
      const rawRecipients = (rule.actionRecipients || rule.recipients) as string[];

      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          organization: true,
          assignees: true
        }
      });

      if (project) {
        for (const item of rawRecipients) {
          if (item === 'PROJECT_MANAGER' && project.projectManagerId) {
            recipientUserIds.push(project.projectManagerId);
          } else if (item === 'PROJECT_OWNER' && project.organization.ownerUserId) {
            recipientUserIds.push(project.organization.ownerUserId);
          } else if (item === 'ASSIGNED_USER') {
            project.assignees.forEach(a => recipientUserIds.push(a.userId));
          } else {
            recipientUserIds.push(item);
          }
        }
      }
      recipientUserIds = Array.from(new Set(recipientUserIds)).filter(Boolean);

      const triggerDesc = `${targetType.toUpperCase()} "${entityData.title || entityData.name}" ${eventType}d (matched: ${rule.triggerField} ${rule.triggerOperator} "${rule.triggerValue}")`;

      try {
        if (rule.actionType === 'Notification Email' || rule.actionType === 'SEND_EMAIL') {
          const usersToEmail = await prisma.user.findMany({
            where: { id: { in: recipientUserIds } },
            select: { email: true, name: true }
          });
          
          const emailsList = usersToEmail.map(u => u.email).join(', ');

          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
              host: process.env.EMAIL_HOST || 'smtp.gmail.com',
              port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : (process.env.EMAIL_SECURE === 'true' ? 465 : 587),
              secure: process.env.EMAIL_SECURE === 'true',
              auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
              },
            });

            for (const u of usersToEmail) {
              await transporter.sendMail({
                from: `"OmniWork Support" <${process.env.EMAIL_USER}>`,
                to: u.email,
                subject: `Automation Alert: ${rule.name}`,
                text: `Hello ${u.name},\n\nOmniWork automation rule "${rule.name}" triggered.\n\nEvent: ${triggerDesc}\n\nDescription: ${rule.description || 'No details provided.'}`
              });
            }

            await prisma.ruleLog.create({
              data: {
                ruleId: rule.id,
                projectId,
                sentTo: emailsList || 'No recipients found',
                status: 'SUCCESSFUL',
                triggerData: triggerDesc
              }
            });
          } else {
            await prisma.ruleLog.create({
              data: {
                ruleId: rule.id,
                projectId,
                sentTo: emailsList || 'No recipients found',
                status: 'FAILED',
                triggerData: triggerDesc,
                error: 'SMTP credentials missing in environment variables (EMAIL_USER/EMAIL_PASS).'
              }
            });
          }
        } 
        else if (rule.actionType === 'In-app Notification' || rule.actionType === 'SEND_REMINDER' || rule.actionType === 'SEND_NOTIFICATION') {
          for (const userId of recipientUserIds) {
            await createNotification({
              organizationId,
              projectId,
              taskId: targetType === 'task' ? entityData.id : undefined,
              actorId: 'system',
              actorRole: 'OWNER',
              type: 'task_updated',
              title: `Automation: ${rule.name}`,
              message: rule.description || `Rule matched on ${targetType} "${entityData.title || entityData.name}".`,
              actionUrl: `/workspace/projects/${projectId}`,
              clientVisible: true
            });
          }

          const usersList = await prisma.user.findMany({
            where: { id: { in: recipientUserIds } },
            select: { name: true }
          });

          await prisma.ruleLog.create({
            data: {
              ruleId: rule.id,
              projectId,
              sentTo: usersList.map(u => u.name).join(', ') || 'No recipients found',
              status: 'SUCCESSFUL',
              triggerData: triggerDesc
            }
          });
        } 
        else if (rule.actionType === 'Create Task' || rule.actionType === 'CREATE_TASK') {
          const createdTask = await prisma.task.create({
            data: {
              organizationId,
              projectId,
              title: `Rule Task: ${rule.name}`,
              description: rule.description || `Created automatically by rule "${rule.name}".`,
              priority: 'MEDIUM',
              allocatedHours: 1.0,
              assignees: recipientUserIds.length > 0 ? {
                create: recipientUserIds.map(userId => ({ userId }))
              } : undefined
            }
          });

          await prisma.ruleLog.create({
            data: {
              ruleId: rule.id,
              projectId,
              sentTo: `Task created: "${createdTask.title}"`,
              status: 'SUCCESSFUL',
              triggerData: triggerDesc
            }
          });
        }
      } catch (err: any) {
        await prisma.ruleLog.create({
          data: {
            ruleId: rule.id,
            projectId,
            sentTo: 'System Error',
            status: 'FAILED',
            triggerData: triggerDesc,
            error: err.message || 'Execution error.'
          }
        });
      }
    }
  } catch (e) {
    console.error('Error executing event-based rules:', e);
  }
}

async function evaluateRuleCondition(
  rule: any,
  targetType: 'project' | 'task',
  entityData: any
): Promise<boolean> {
  const field = rule.triggerField;
  const operator = rule.triggerOperator;
  const val = rule.triggerValue?.toLowerCase() || '';

  let actualValue = '';

  if (targetType === 'task') {
    const task = await prisma.task.findUnique({
      where: { id: entityData.id },
      include: {
        status: true,
        project: true,
        assignees: { include: { user: true } }
      }
    });
    if (!task) return false;

    if (field === 'Title') {
      actualValue = task.title || '';
    } else if (field === 'Status') {
      actualValue = task.status?.name || '';
    } else if (field === 'Priority') {
      actualValue = task.priority || '';
    } else if (field === 'Due Date') {
      actualValue = task.dueDate ? task.dueDate.toLocaleDateString() : '';
    } else if (field === 'Assigned User') {
      const assignees = task.assignees.map(a => a.user.name.toLowerCase());
      return assignees.some(name => matchCondition(name, operator, val));
    } else if (field === 'Project') {
      actualValue = task.project?.name || '';
    }
  } else if (targetType === 'project') {
    const project = await prisma.project.findUnique({
      where: { id: entityData.id },
      include: {
        status: true,
        projectManager: true,
        assignees: { include: { user: true } }
      }
    });
    if (!project) return false;

    if (field === 'Title') {
      actualValue = project.name || '';
    } else if (field === 'Status') {
      actualValue = project.status?.name || '';
    } else if (field === 'Priority') {
      actualValue = project.priority || '';
    } else if (field === 'Due Date') {
      actualValue = project.endDate ? project.endDate.toLocaleDateString() : '';
    } else if (field === 'Assigned User') {
      const pm = project.projectManager?.name?.toLowerCase() || '';
      const assignees = project.assignees.map(a => a.user.name.toLowerCase());
      const all = [pm, ...assignees].filter(Boolean);
      return all.some(name => matchCondition(name, operator, val));
    } else if (field === 'Project') {
      actualValue = project.name || '';
    }
  }

  return matchCondition(actualValue.toLowerCase(), operator, val);
}

function matchCondition(actual: string, operator: string, val: string): boolean {
  if (operator === 'Equals') {
    return actual === val;
  } else if (operator === 'Contains') {
    return actual.includes(val);
  } else if (operator === 'Starts With') {
    return actual.startsWith(val);
  } else if (operator === 'Ends With') {
    return actual.endsWith(val);
  }
  return false;
}

