import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const groups = await prisma.chatGroup.findMany({
      where: {
        organizationId: session.organizationId,
        members: {
          some: {
            userId: session.userId
          }
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ groups });
  } catch (error: any) {
    console.error('Fetch groups error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { name, description, userIds = [] } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Ensure current user is in the list of members
    const membersSet = new Set<string>(userIds);
    membersSet.add(session.userId);

    const group = await prisma.chatGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        organizationId: session.organizationId,
        ownerId: session.userId,
        members: {
          create: Array.from(membersSet).map((userId: string) => ({
            userId
          }))
        }
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true }
            }
          }
        }
      }
    });

    return NextResponse.json({ group });
  } catch (error: any) {
    console.error('Create group error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
