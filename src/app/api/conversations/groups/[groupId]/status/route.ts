import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await context.params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: {
        members: true
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Verify user is member of the group
    const isMember = group.members.some(m => m.userId === session.userId);
    if (!isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const updatedGroup = await prisma.chatGroup.update({
      where: { id: groupId },
      data: {
        status
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } }
          }
        }
      }
    });

    return NextResponse.json({ group: updatedGroup });
  } catch (error: any) {
    console.error('Update group status error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
