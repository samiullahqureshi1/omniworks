import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { groupId } = await context.params;

    const group = await prisma.chatGroup.findUnique({
      where: { id: groupId },
      include: {
        members: true
      }
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isMember = group.members.some(m => m.userId === session.userId);
    const isOwner = group.ownerId === session.userId;

    if (group.isDirect) {
      // For direct chats, either member can delete/decline
      if (!isMember) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    } else {
      // For regular groups, only the owner can delete
      if (!isOwner) {
        return NextResponse.json({ error: 'Only the group owner can delete this group' }, { status: 403 });
      }
    }

    await prisma.chatGroup.delete({
      where: { id: groupId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete group route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
