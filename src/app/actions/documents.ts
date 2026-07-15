'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

type DocumentInput = {
  type: 'DOC' | 'FILE';
  title: string;
  content?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  projectId?: string | null;
  taskId?: string | null;
};

/**
 * Verify the given project/task belongs to the caller's organization so a user
 * can only attach documents to entities they can access.
 */
async function assertEntityInOrg(
  organizationId: string,
  projectId?: string | null,
  taskId?: string | null
) {
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, organizationId },
      select: { id: true },
    });
    if (!project) return false;
  }
  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, organizationId },
      select: { id: true },
    });
    if (!task) return false;
  }
  return true;
}

export async function getDocumentsAction(params: { projectId?: string; taskId?: string }) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const { projectId, taskId } = params;
    if (!projectId && !taskId) {
      return { error: 'A projectId or taskId is required.' };
    }

    const documents = await prisma.document.findMany({
      where: {
        organizationId: session.organizationId,
        ...(projectId ? { projectId } : {}),
        ...(taskId ? { taskId } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { success: true, documents };
  } catch (error: any) {
    return { error: error.message || 'Failed to load documents.' };
  }
}

export async function createDocumentAction(input: DocumentInput) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const title = (input.title || '').trim();
    if (!title) return { error: 'A title is required.' };
    if (!input.projectId && !input.taskId) {
      return { error: 'A document must be attached to a project or task.' };
    }
    if (input.type === 'FILE' && !input.fileUrl) {
      return { error: 'A file is required for file documents.' };
    }

    const inOrg = await assertEntityInOrg(
      session.organizationId,
      input.projectId,
      input.taskId
    );
    if (!inOrg) return { error: 'Project or task not found in your organization.' };

    const document = await prisma.document.create({
      data: {
        type: input.type,
        title,
        content: input.type === 'DOC' ? input.content ?? '' : null,
        fileUrl: input.type === 'FILE' ? input.fileUrl : null,
        fileName: input.type === 'FILE' ? input.fileName : null,
        fileSize: input.type === 'FILE' ? input.fileSize : null,
        organizationId: session.organizationId,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        createdById: session.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (input.projectId) revalidatePath(`/workspace/projects/${input.projectId}`);

    return { success: true, document };
  } catch (error: any) {
    return { error: error.message || 'Failed to create document.' };
  }
}

export async function updateDocumentAction(
  id: string,
  data: { title?: string; content?: string }
) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const existing = await prisma.document.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!existing) return { error: 'Document not found.' };

    const document = await prisma.document.update({
      where: { id },
      data: {
        ...(data.title !== undefined ? { title: data.title.trim() } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    return { success: true, document };
  } catch (error: any) {
    return { error: error.message || 'Failed to update document.' };
  }
}

export async function deleteDocumentAction(id: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const existing = await prisma.document.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true },
    });
    if (!existing) return { error: 'Document not found.' };

    await prisma.document.delete({ where: { id } });

    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete document.' };
  }
}
