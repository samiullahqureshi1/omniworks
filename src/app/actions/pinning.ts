'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

// --- PINNED TASKS ---

export async function togglePinTaskAction(taskId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    const existing = await prisma.pinnedTask.findFirst({
      where: { userId: session.userId, taskId },
    });
    if (existing) {
      await prisma.pinnedTask.delete({ where: { id: existing.id } });
      return { success: true, pinned: false };
    }
    const task = await prisma.task.findFirst({
      where: { id: taskId },
    });
    if (!task) return { error: 'Task not found' };
    await prisma.pinnedTask.create({
      data: { userId: session.userId, taskId, organizationId: task.organizationId || session.organizationId },
    });
    return { success: true, pinned: true };
  } catch (err) {
    console.error('togglePinTaskAction error:', err);
    return { error: 'Failed to toggle pin' };
  }
}

export async function getPinnedTasksAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized', tasks: [] };
    const pinned = await prisma.pinnedTask.findMany({
      where: { userId: session.userId },
      orderBy: { pinnedAt: 'desc' },
      take: 8,
      include: {
        task: {
          include: {
            project: { select: { id: true, name: true, projectManagerId: true, clientId: true, totalAllocatedHours: true } },
            status: true,
            assignees: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
            milestone: true,
          },
        },
      },
    });
    return { success: true, tasks: pinned.map((p) => p.task).filter(Boolean) };
  } catch (err) {
    console.error('getPinnedTasksAction error:', err);
    return { error: 'Failed to fetch pinned tasks', tasks: [] };
  }
}

export async function getMyPinnedTaskIdsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized', ids: [] };
    const pinned = await prisma.pinnedTask.findMany({
      where: { userId: session.userId },
      select: { taskId: true },
    });
    return { success: true, ids: pinned.map((p) => p.taskId) };
  } catch {
    return { error: 'Failed', ids: [] };
  }
}

// --- PINNED CHATS ---

export async function togglePinChatAction(params: {
  chatType: 'project' | 'group' | 'direct';
  chatGroupId?: string;
  projectId?: string;
  displayName: string;
}) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    const { chatType, chatGroupId, projectId, displayName } = params;
    if (chatGroupId) {
      const existing = await prisma.pinnedChat.findFirst({
        where: { userId: session.userId, chatGroupId },
      });
      if (existing) {
        await prisma.pinnedChat.delete({ where: { id: existing.id } });
        return { success: true, pinned: false };
      }
      await prisma.pinnedChat.create({
        data: { userId: session.userId, organizationId: session.organizationId, chatGroupId, chatType, displayName },
      });
      return { success: true, pinned: true };
    }
    if (projectId) {
      const existing = await prisma.pinnedChat.findFirst({
        where: { userId: session.userId, projectId },
      });
      if (existing) {
        await prisma.pinnedChat.delete({ where: { id: existing.id } });
        return { success: true, pinned: false };
      }
      await prisma.pinnedChat.create({
        data: { userId: session.userId, organizationId: session.organizationId, projectId, chatType: 'project', displayName },
      });
      return { success: true, pinned: true };
    }
    return { error: 'Must provide chatGroupId or projectId' };
  } catch (err) {
    console.error('togglePinChatAction error:', err);
    return { error: 'Failed to toggle pin' };
  }
}

export async function getPinnedChatsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized', chats: [] };
    const pinned = await prisma.pinnedChat.findMany({
      where: { userId: session.userId },
      orderBy: { pinnedAt: 'desc' },
      take: 8,
    });
    return { success: true, chats: pinned };
  } catch (err) {
    console.error('getPinnedChatsAction error:', err);
    return { error: 'Failed to fetch pinned chats', chats: [] };
  }
}

export async function getMyPinnedChatIdsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized', groupIds: [], projectIds: [] };
    const pinned = await prisma.pinnedChat.findMany({
      where: { userId: session.userId },
      select: { chatGroupId: true, projectId: true },
    });
    return {
      success: true,
      groupIds: pinned.map((p) => p.chatGroupId).filter(Boolean) as string[],
      projectIds: pinned.map((p) => p.projectId).filter(Boolean) as string[],
    };
  } catch {
    return { error: 'Failed', groupIds: [], projectIds: [] };
  }
}
