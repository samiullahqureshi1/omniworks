import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { isViewRestricted } from '@/lib/permissions';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, userId, organizationId } = session;

    // Organization scoping is applied unconditionally and can never be overwritten
    // by a later filter. (The previous version spread a second `OR` key on top of the
    // org-scoping `OR`, which silently dropped tenant isolation for CLIENT users.)
    const where: Prisma.ProjectWhereInput = { organizationId };

    if (role === 'CLIENT') {
      // Clients only ever see their own, non-internal projects.
      where.isInternal = false;
      where.OR = [{ clientId: userId }, { assignees: { some: { userId } } }];
    } else if (role === 'MEMBER' && isViewRestricted(session, 'PROJECT_VIEW')) {
      // No PROJECT_VIEW → limited to projects the member is actually involved with.
      where.OR = [
        { tasks: { some: { assignees: { some: { userId } } } } },
        { projectManagerId: userId },
        { assignees: { some: { userId } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        priority: true,
        clientId: true,
        projectManagerId: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
