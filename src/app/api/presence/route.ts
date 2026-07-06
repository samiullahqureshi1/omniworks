import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { emitAppEvent } from '@/lib/events';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const presence = await prisma.userPresence.upsert({
      where: { userId: session.userId },
      update: {
        status: 'ONLINE',
        lastSeen: new Date(),
        organizationId: session.organizationId,
      },
      create: {
        userId: session.userId,
        status: 'ONLINE',
        lastSeen: new Date(),
        organizationId: session.organizationId,
      }
    });

    emitAppEvent('presence_updated', `organization:${session.organizationId}`, {
      userId: session.userId,
      status: 'ONLINE',
      lastSeen: presence.lastSeen.toISOString()
    });

    return NextResponse.json({ success: true, presence });
  } catch (error: any) {
    console.error('Presence heartbeat error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
