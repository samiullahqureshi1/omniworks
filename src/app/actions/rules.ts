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

async function getFieldValueForEntity(
  targetType: 'project' | 'task',
  entity: any,
  field: string
): Promise<string> {
  if (targetType === 'task') {
    if (field === 'Title') {
      return entity.title || '';
    } else if (field === 'Status') {
      if (entity.status && typeof entity.status === 'object') {
        return entity.status.name || '';
      }
      if (entity.statusId) {
        const st = await prisma.taskStatus.findUnique({ where: { id: entity.statusId } });
        return st?.name || '';
      }
      return '';
    } else if (field === 'Priority') {
      return entity.priority || '';
    } else if (field === 'Due Date') {
      return entity.dueDate ? new Date(entity.dueDate).toLocaleDateString() : '';
    } else if (field === 'Assigned User') {
      if (entity.assignees && Array.isArray(entity.assignees)) {
        const names = entity.assignees.map((a: any) => {
          if (a.user) return a.user.name.toLowerCase();
          return '';
        }).filter(Boolean);
        return names.join(', ');
      }
      return '';
    } else if (field === 'Project') {
      if (entity.project) return entity.project.name || '';
      if (entity.projectId) {
        const p = await prisma.project.findUnique({ where: { id: entity.projectId } });
        return p?.name || '';
      }
      return '';
    }
  } else if (targetType === 'project') {
    if (field === 'Title') {
      return entity.name || '';
    } else if (field === 'Status') {
      if (entity.status && typeof entity.status === 'object') {
        return entity.status.name || '';
      }
      if (entity.statusId) {
        const st = await prisma.projectStatus.findUnique({ where: { id: entity.statusId } });
        return st?.name || '';
      }
      return '';
    } else if (field === 'Priority') {
      return entity.priority || '';
    } else if (field === 'Due Date') {
      return entity.endDate ? new Date(entity.endDate).toLocaleDateString() : '';
    } else if (field === 'Assigned User') {
      let names: string[] = [];
      if (entity.projectManagerId) {
        const pm = await prisma.user.findUnique({ where: { id: entity.projectManagerId } });
        if (pm) names.push(pm.name.toLowerCase());
      }
      if (entity.assignees && Array.isArray(entity.assignees)) {
        entity.assignees.forEach((a: any) => {
          if (a.user) names.push(a.user.name.toLowerCase());
        });
      }
      return names.join(', ');
    } else if (field === 'Project') {
      return entity.name || '';
    }
  }
  return '';
}

async function hasDuplicateExecution(
  ruleId: string,
  targetId: string,
  currentNewValue: string
): Promise<boolean> {
  const lastLog = await prisma.ruleLog.findFirst({
    where: {
      ruleId,
      status: 'SUCCESSFUL'
    },
    orderBy: { executedAt: 'desc' }
  });

  if (!lastLog || !lastLog.triggerData) return false;

  try {
    const data = JSON.parse(lastLog.triggerData);
    if (data && data.targetId === targetId && data.newValue === currentNewValue) {
      return true;
    }
  } catch {
    // Ignore JSON parsing errors for old logs
  }
  return false;
}

// Event-Based Rules Automation Engine
export async function triggerEventRules(
  organizationId: string,
  eventType: 'create' | 'update',
  targetType: 'project' | 'task',
  entityData: any,
  oldEntityData?: any
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

      // Resolve old and new values of trigger field
      const field = rule.triggerField || 'Status';
      const newValue = await getFieldValueForEntity(targetType, entityData, field);
      let oldValue = '';

      if (eventType === 'update' && oldEntityData) {
        oldValue = await getFieldValueForEntity(targetType, oldEntityData, field);
        if (oldValue === newValue) {
          // Trigger Only On Actual Change
          continue;
        }
      }

      // Check duplicate execution logs
      const isDuplicate = await hasDuplicateExecution(rule.id, entityData.id, newValue);
      if (isDuplicate) {
        // Prevent Duplicate Notifications
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
          assignees: true,
          status: true
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

      const trackingInfo = {
        ruleId: rule.id,
        targetId: entityData.id,
        triggerField: rule.triggerField,
        previousValue: oldValue || '(Created)',
        newValue: newValue,
        executedAt: new Date().toISOString()
      };
      
      const triggerDesc = JSON.stringify(trackingInfo);

      try {
        if (rule.actionType === 'Notification Email' || rule.actionType === 'SEND_EMAIL') {
          const usersToEmail = await prisma.user.findMany({
            where: { id: { in: recipientUserIds } },
            select: { email: true, name: true }
          });
          
          const emailsList = usersToEmail.map(u => u.email).join(', ');

          if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            let taskDetails: any = null;
            if (targetType === 'task') {
              taskDetails = await prisma.task.findUnique({
                where: { id: entityData.id },
                include: {
                  status: true,
                  assignees: { include: { user: true } }
                }
              });
            }

            let emailSubject = '';
            let introText = '';
            let tableRowsHtml = '';
            let textBody = '';
            const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
            const viewUrl = targetType === 'task' 
              ? `${baseUrl}/workspace/projects/${projectId}?taskId=${entityData.id}`
              : `${baseUrl}/workspace/projects/${projectId}`;
            const ctaText = targetType === 'task' ? 'View Task' : 'View Project';

            if (targetType === 'project') {
              emailSubject = `Project Status Updated - ${project?.name || ''}`;
              introText = `The project status has been updated.`;
              
              tableRowsHtml = `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; width: 35%;">Project</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${project?.name || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569;">New Status</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a;"><span style="background-color: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 600; border: 1px solid #e2e8f0;">${newValue}</span></td>
                </tr>
              `;

              textBody = `Hello,\n\nThe project status has been updated.\n\nProject: ${project?.name || ''}\nNew Status: ${newValue}\n\nYou can view the project here: ${viewUrl}`;
            } else if (targetType === 'task' && taskDetails) {
              emailSubject = `Task Assigned/Updated - ${taskDetails.title}`;
              introText = `A task has been ${eventType === 'create' ? 'created' : 'updated'} in project "${project?.name || ''}".`;
              
              const assigneesList = taskDetails.assignees.map((a: any) => a.user.name).join(', ') || 'Unassigned';
              const dueDateStr = taskDetails.dueDate ? new Date(taskDetails.dueDate).toLocaleDateString() : 'No due date';

              tableRowsHtml = `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; width: 35%;">Task Name</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 700;">${taskDetails.title}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569;">Project</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${project?.name || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569;">Priority</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${taskDetails.priority || 'MEDIUM'}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569;">Due Date</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${dueDateStr}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569;">Assigned To</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${assigneesList}</td>
                </tr>
              `;

              textBody = `Hello,\n\nA task has been ${eventType === 'create' ? 'created' : 'updated'} in project "${project?.name || ''}".\n\nTask Name: ${taskDetails.title}\nPriority: ${taskDetails.priority || 'MEDIUM'}\nDue Date: ${dueDateStr}\nAssigned To: ${assigneesList}\n\nYou can view the task here: ${viewUrl}`;
            } else {
              emailSubject = `OmniWork Notification - ${project?.name || ''}`;
              introText = `An event triggered a notification.`;

              tableRowsHtml = `
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #475569; width: 35%;">Event</td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">Matched rule trigger field "${rule.triggerField}"</td>
                </tr>
              `;

              textBody = `Hello,\n\nAn event triggered a notification on project "${project?.name || ''}".\n\nYou can view it here: ${viewUrl}`;
            }

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
              const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 0;">
  <div style="width: 100%; background-color: #f8fafc; padding: 40px 20px; box-sizing: border-box;">
    <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.025em;">OmniWork</h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Hello ${u.name},</p>
        <p style="font-size: 15px; color: #475569; line-height: 1.5; margin-bottom: 24px;">${introText}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 28px; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden;">
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        
        <div style="text-align: center; margin-bottom: 12px;">
          <a href="${viewUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 600; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">${ctaText}</a>
        </div>
      </div>
      <div style="padding: 20px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; line-height: 1.5;">
        This notification was sent because this project matched an automation rule configured in OmniWork.<br>
        <a href="${baseUrl}" style="color: #4f46e5; text-decoration: none; font-weight: 600;">Go to Dashboard</a>
      </div>
    </div>
  </div>
</body>
</html>
              `;

              await transporter.sendMail({
                from: `"OmniWork Notifications" <${process.env.EMAIL_USER}>`,
                to: u.email,
                subject: emailSubject,
                text: textBody,
                html: htmlContent
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

