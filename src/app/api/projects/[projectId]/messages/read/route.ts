import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { emitAppEvent } from '@/lib/events';

export async function POST(req: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messageIds } = body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    const { projectId } = await context.params;

    const now = new Date();

    // Update read receipts
    await prisma.messageReadReceipt.updateMany({
      where: {
        userId: session.userId,
        messageId: { in: messageIds },
        readAt: null
      },
      data: {
        readAt: now
      }
    });

    // Notify others that these messages were read by this user
    emitAppEvent('message_read', `project:${projectId}`, {
      userId: session.userId,
      messageIds,
      readAt: now.toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Read receipt error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
