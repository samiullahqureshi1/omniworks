'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function getProjectFormDataAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const users = await prisma.user.findMany({
      where: { organizationId: session.organizationId, status: 'ACTIVE' },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    const projectStatuses = await prisma.projectStatus.findMany({
      where: { organizationId: session.organizationId },
      orderBy: { order: 'asc' },
    });

    return { success: true, users, projectStatuses };
  } catch (error: any) {
    return { error: error.message };
  }
}
