import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/permissions';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only the modules the caller may view are returned. Previously this route also
    // pulled in parent- and child-organization users, which crossed the tenant
    // boundary; membership listings are now strictly scoped to the active org.
    const canViewUsers = can(session, 'USER_VIEW');
    const canViewClients = can(session, 'CLIENT_VIEW');

    if (!canViewUsers && !canViewClients) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const roleScope: Prisma.UserWhereInput = canViewUsers && canViewClients
      ? {}
      : canViewClients
        ? { role: 'CLIENT' }
        : { NOT: { role: 'CLIENT' } };

    const users = await prisma.user.findMany({
      where: {
        organizationId: session.organizationId,
        NOT: { id: session.userId },
        ...roleScope,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
