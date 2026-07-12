import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { emitAppEvent } from '@/lib/events';

export async function GET(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await context.params;

    // Verify access (must be a member of the group)
    const member = await prisma.chatGroupMember.findFirst({
      where: {
        groupId,
        userId: session.userId
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const messages = await prisma.groupMessage.findMany({
      where: {
        groupId,
        organizationId: session.organizationId
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
        readReceipts: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark these messages as read for the current user (async, don't block response)
    (async () => {
      try {
        const unreadMessageIds = messages
          .filter(msg => !msg.readReceipts.some(receipt => receipt.userId === session.userId))
          .map(msg => msg.id);

        if (unreadMessageIds.length > 0) {
          await prisma.groupMessageReadReceipt.createMany({
            data: unreadMessageIds.map(messageId => ({
              messageId,
              userId: session.userId
            })),
            skipDuplicates: true
          });
          emitAppEvent('message_read', `group:${groupId}`, {
            groupId,
            userId: session.userId,
            messageIds: unreadMessageIds
          });
        }
      } catch (err) {
        console.error('Mark read receipts error:', err);
      }
    })();

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Fetch group messages error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await context.params;
    const { content, parentMessageId, fileUrl, fileName, fileSize } = await request.json();

    if (!content?.trim() && !fileUrl) {
      return NextResponse.json({ error: 'Message content or file is required' }, { status: 400 });
    }

    // Verify access
    const member = await prisma.chatGroupMember.findFirst({
      where: {
        groupId,
        userId: session.userId
      }
    });

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const message = await prisma.groupMessage.create({
      data: {
        groupId,
        organizationId: session.organizationId,
        senderId: session.userId,
        content: content?.trim() || '',
        parentMessageId: parentMessageId || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize ? parseFloat(fileSize) : null,
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

    // Create read receipt for the sender
    await prisma.groupMessageReadReceipt.create({
      data: {
        messageId: message.id,
        userId: session.userId
      }
    }).catch(err => console.error('Failed to create sender read receipt:', err));

    // Update group's updatedAt timestamp to float it to top of conversation list
    await prisma.chatGroup.update({
      where: { id: groupId },
      data: { updatedAt: new Date() }
    }).catch(err => console.error('Failed to update group timestamp:', err));

    // Emit Realtime Event
    emitAppEvent('message_sent', `group:${groupId}`, { message });

    return NextResponse.json({ message });
  } catch (error: any) {
    console.error('Send group message error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
