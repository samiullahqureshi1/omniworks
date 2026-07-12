import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { emitAppEvent } from '@/lib/events';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ groupId: string; messageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId, messageId } = await context.params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Verify message sender and group
    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.senderId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized to edit this message' }, { status: 403 });
    }

    if (message.groupId !== groupId) {
      return NextResponse.json({ error: 'Message does not belong to this group' }, { status: 400 });
    }

    const updatedMessage = await prisma.groupMessage.update({
      where: { id: messageId },
      data: {
        content: content.trim(),
        isEdited: true
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true }
        },
        parentMessage: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            fileUrl: true,
            fileName: true,
            sender: {
              select: { name: true }
            }
          }
        },
        readReceipts: true
      }
    });

    emitAppEvent('message_edited', `group:${groupId}`, { message: updatedMessage });

    return NextResponse.json({ message: updatedMessage });
  } catch (error: any) {
    console.error('Edit group message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ groupId: string; messageId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId, messageId } = await context.params;

    // Verify message sender and group
    const message = await prisma.groupMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.senderId !== session.userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this message' }, { status: 403 });
    }

    if (message.groupId !== groupId) {
      return NextResponse.json({ error: 'Message does not belong to this group' }, { status: 400 });
    }

    await prisma.groupMessage.delete({
      where: { id: messageId }
    });

    emitAppEvent('message_deleted', `group:${groupId}`, { messageId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete group message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
