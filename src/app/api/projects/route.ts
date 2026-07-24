import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role, userId, organizationId } = session;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { organizationId },
          { organization: { parentOrganizationId: organizationId } }
        ],
        ...(role === 'CLIENT' ? {
          OR: [
            { clientId: userId },
            { assignees: { some: { userId } } }
          ]
        } : {})
      },
      select: {
        id: true,
        name: true,
        description: true,
        priority: true,
        clientId: true,
        projectManagerId: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error('Error fetching projects list:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
