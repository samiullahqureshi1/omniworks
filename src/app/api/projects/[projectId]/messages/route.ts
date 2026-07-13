import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { emitAppEvent } from '@/lib/events';

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await context.params;

    // Verify access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: session.organizationId,
        ...(session.role === 'CLIENT' ? { clientId: session.userId } : {}),
        ...(session.role === 'MEMBER' ? {
          OR: [
            { tasks: { some: { assignees: { some: { userId: session.userId } } } } },
            { projectManagerId: session.userId },
          ]
        } : {})
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const messages = await prisma.projectMessage.findMany({
      where: {
        projectId,
        organizationId: session.organizationId,
        ...(session.role === 'CLIENT' ? { visibility: 'PUBLIC' } : {})
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        },
        mentions: {
          include: { mentionedUser: { select: { id: true, name: true } } }
        },
        taskMentions: {
          include: { task: { select: { id: true, title: true, statusId: true } } }
        },
        readReceipts: true,
        parentMessage: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            deletedAt: true,
            visibility: true,
            sender: {
              select: { name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Fetch messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await context.params;
    const { content, visibility, mentions = [], taskMentions = [], parentMessageId } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Verify access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: session.organizationId,
        ...(session.role === 'CLIENT' ? { clientId: session.userId } : {}),
        ...(session.role === 'MEMBER' ? {
          OR: [
            { tasks: { some: { assignees: { some: { userId: session.userId } } } } },
            { projectManagerId: session.userId },
          ]
        } : {})
      },
      include: {
        client: { select: { id: true, name: true } }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const msgVisibility = session.role === 'CLIENT' ? 'PUBLIC' : (visibility || 'INTERNAL');

    let parentMessage = null;
    if (parentMessageId) {
      parentMessage = await prisma.projectMessage.findFirst({
        where: { id: parentMessageId, projectId }
      });
      if (!parentMessage) {
        return NextResponse.json({ error: 'Parent message not found or belongs to a different project' }, { status: 400 });
      }
      if (session.role === 'CLIENT' && parentMessage.visibility !== 'PUBLIC') {
        return NextResponse.json({ error: 'Unauthorized to reply to this message' }, { status: 403 });
      }
      if (session.role === 'MEMBER' && parentMessage.visibility !== 'PUBLIC' && msgVisibility === 'PUBLIC') {
        // Members typically shouldn't make internal messages public via reply, but we'll allow standard visibility logic.
      }
    }

    // Determine Intended Recipients for Read Receipts
    const recipientIds = new Set<string>();
    if (msgVisibility === 'PUBLIC' && project.clientId) {
      recipientIds.add(project.clientId);
    }
    if (project.projectManagerId) {
      recipientIds.add(project.projectManagerId);
    }
    const projectAssignees = await prisma.projectAssignee.findMany({ where: { projectId } });
    projectAssignees.forEach(pa => recipientIds.add(pa.userId));
    
    const owners = await prisma.user.findMany({
      where: { organizationId: session.organizationId, role: 'OWNER' },
      select: { id: true }
    });
    owners.forEach(o => recipientIds.add(o.id));
    
    recipientIds.delete(session.userId);

    const message = await prisma.projectMessage.create({
      data: {
        organizationId: session.organizationId,
        projectId,
        senderId: session.userId,
        content,
        visibility: msgVisibility,
        parentMessageId: parentMessageId || null,
        mentions: {
          create: Array.from<string>(new Set((mentions || []).filter(Boolean))).map((userId: string) => ({ mentionedUserId: userId }))
        },
        taskMentions: {
          create: Array.from<string>(new Set((taskMentions || []).filter(Boolean))).map((taskId: string) => ({ taskId }))
        },
        readReceipts: {
          create: Array.from(recipientIds).map(userId => ({
            userId,
            deliveredAt: new Date()
          }))
        }
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
        taskMentions: { include: { task: { select: { id: true, title: true, statusId: true } } } },
        readReceipts: true,
        parentMessage: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            deletedAt: true,
            visibility: true,
            sender: { select: { name: true } }
          }
        }
      }
    });

    // Realtime Event
    emitAppEvent('message_sent', `project:${projectId}`, { message });

    // Also push to each recipient's personal channel so desktop notifications
    // fire no matter what page they're currently on
    recipientIds.forEach(userId => {
      emitAppEvent('message_sent', `user:${userId}`, { message });
    });

    // Send Notifications to mentioned users and task participants (async, don't await)
    (async () => {
      try {
        const notifyUserIds = new Set<string>();
        let replyRecipientId: string | null = null;

        if (parentMessage && parentMessage.senderId !== session.userId) {
          replyRecipientId = parentMessage.senderId;
          // Send specific reply notification
          await prisma.notification.create({
            data: {
              organizationId: session.organizationId,
              projectId,
              recipientId: replyRecipientId,
              actorId: session.userId,
              type: 'mention', // using mention or generic type
              title: 'New Reply',
              message: `${session.name} replied to your message in ${project.name}`,
              actionUrl: `/workspace/projects/${projectId}?tab=conversation`
            }
          });
          emitAppEvent('notification_created', `user:${replyRecipientId}`, { type: 'mention' });
        }

        // Add explicit member mentions
        if (mentions && Array.isArray(mentions)) {
          mentions.forEach((id: string) => {
            if (id !== replyRecipientId) notifyUserIds.add(id);
          });
        }

        // Add users related to task mentions
        if (taskMentions && Array.isArray(taskMentions) && taskMentions.length > 0) {
          const tasks = await prisma.task.findMany({
            where: { id: { in: taskMentions } },
            include: { assignees: true }
          });
          
          tasks.forEach(t => {
            t.assignees.forEach(a => notifyUserIds.add(a.userId));
          });

          if (project.projectManagerId) {
            notifyUserIds.add(project.projectManagerId);
          }

          const owners = await prisma.user.findMany({
            where: { organizationId: session.organizationId, role: 'OWNER' },
            select: { id: true }
          });
          owners.forEach(o => notifyUserIds.add(o.id));
        }

        // Do not notify self
        notifyUserIds.delete(session.userId);

        for (const userId of Array.from(notifyUserIds)) {
          await prisma.notification.create({
            data: {
              organizationId: session.organizationId,
              projectId,
              recipientId: userId,
              actorId: session.userId,
              type: 'mention',
              title: 'New Mention',
              message: `${session.name} mentioned you or a task you're assigned to in ${project.name}`,
              actionUrl: `/workspace/projects/${projectId}?tab=conversation`
            }
          });
          emitAppEvent('notification_created', `user:${userId}`, { type: 'mention' });
        }
      } catch (err) {
        console.error('Mention notifications error:', err);
      }
    })();

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Create message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
