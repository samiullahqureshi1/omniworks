import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentOrg = session.organizationId ? await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { id: true, parentOrganizationId: true }
    }) : null;

    const orgIds = Array.from(new Set([
      session.organizationId,
      currentOrg?.parentOrganizationId
    ].filter(Boolean))) as string[];

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { organizationId: { in: orgIds } },
          { organization: { parentOrganizationId: session.organizationId } }
        ],
        NOT: { id: session.userId }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
