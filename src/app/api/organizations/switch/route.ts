import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cookieStore = await cookies();

    // Remember the last org this person chose, so login can restore it. This
    // cookie is intentionally long-lived and survives logout.
    const rememberLastOrg = (orgId: string) =>
      cookieStore.set('omniwork_last_org', orgId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });

    // Case 1: A shared/member org — the same person has a separate ACTIVE user
    // record (matched by email) in the target org. Switch by re-issuing the
    // session as THAT identity (different userId/role), and drop any child-org
    // override cookie so the fresh session is used verbatim.
    const membership = await prisma.user.findFirst({
      where: { email: user.email, organizationId, status: 'ACTIVE' },
      select: { id: true, email: true, name: true, role: true, organizationId: true },
    });

    if (membership) {
      const newSession = await createSession(membership);
      cookieStore.delete('omniwork_active_org');
      rememberLastOrg(membership.organizationId);
      return NextResponse.json({
        success: true,
        organization: { id: newSession.organizationId, name: newSession.organizationName },
      });
    }

    // Case 2: A child of the user's base org (or an org they own) accessed via
    // the base identity + org-override cookie.
    const childOrg = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        OR: [
          { ownerUserId: user.id },
          { parentOrganizationId: user.organizationId },
          { id: user.organizationId },
        ],
      },
      select: { id: true, name: true },
    });

    if (!childOrg) {
      return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
    }

    cookieStore.set('omniwork_active_org', childOrg.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    rememberLastOrg(childOrg.id);

    return NextResponse.json({ success: true, organization: childOrg });
  } catch (error: any) {
    console.error('Error switching organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
