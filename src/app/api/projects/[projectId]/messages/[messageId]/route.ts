import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { emitAppEvent } from '@/lib/events';

export async function PATCH(request: Request, context: { params: Promise<{ projectId: string, messageId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId, messageId } = await context.params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const message = await prisma.projectMessage.findUnique({
      where: { id: messageId }
    });

    if (!message || message.projectId !== projectId || message.senderId !== session.userId) {
      return NextResponse.json({ error: 'Message not found or unauthorized' }, { status: 404 });
    }

    if (message.deletedAt) {
      return NextResponse.json({ error: 'Cannot edit deleted message' }, { status: 400 });
    }

    const updatedMessage = await prisma.projectMessage.update({
      where: { id: messageId },
      data: { 
        content, 
        isEdited: true 
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
        taskMentions: { include: { task: { select: { id: true, title: true, statusId: true } } } }
      }
    });

    // We can emit an event for message edited
    emitAppEvent('message_edited', `project:${projectId}`, { message: updatedMessage });

    return NextResponse.json({ message: updatedMessage });
  } catch (error: any) {
    console.error('Update message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ projectId: string, messageId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId, messageId } = await context.params;

    const message = await prisma.projectMessage.findUnique({
      where: { id: messageId }
    });

    if (!message || message.projectId !== projectId || message.senderId !== session.userId) {
      return NextResponse.json({ error: 'Message not found or unauthorized' }, { status: 404 });
    }

    const deletedMessage = await prisma.projectMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        mentions: { include: { mentionedUser: { select: { id: true, name: true } } } },
        taskMentions: { include: { task: { select: { id: true, title: true, statusId: true } } } }
      }
    });

    // We can emit an event for message deleted
    emitAppEvent('message_deleted', `project:${projectId}`, { message: deletedMessage });

    return NextResponse.json({ message: deletedMessage });
  } catch (error: any) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
