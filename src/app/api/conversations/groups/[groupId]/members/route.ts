import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await context.params;
    const { userIds } = await request.json();

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ error: 'Invalid user IDs list' }, { status: 400 });
    }

    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Only the group owner can modify members' }, { status: 403 });
    }

    // Ensure owner is always a member
    const updatedUserIds = new Set<string>(userIds);
    updatedUserIds.add(group.ownerId);

    // Delete existing member records
    await prisma.chatGroupMember.deleteMany({
      where: { groupId }
    });

    // Re-create members
    await prisma.chatGroupMember.createMany({
      data: Array.from(updatedUserIds).map(userId => ({
        groupId,
        userId
      }))
    });

    // Fetch updated group members to return to client
    const updatedGroup = await prisma.chatGroup.findUnique({
      where: { id: groupId },
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
    console.error('Modify members error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await context.params;

    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Only the group owner can delete this group' }, { status: 403 });
    }

    await prisma.chatGroup.delete({
      where: { id: groupId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete group error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
