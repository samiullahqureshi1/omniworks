import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
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

    // Verify user owns the active org or it's a child of their base org
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetOrg = await prisma.organization.findFirst({
      where: {
        id: organizationId,
        OR: [
          { ownerUserId: user.id },
          { parentOrganizationId: user.organizationId }, // Allow if it's a child of the base org
          { id: user.organizationId } // Allow self (reset to parent)
        ]
      }
    });

    if (!targetOrg) {
      return NextResponse.json({ error: 'You do not have access to this organization' }, { status: 403 });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set('omniwork_active_org', targetOrg.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true, organization: targetOrg });
  } catch (error: any) {
    console.error('Error switching organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
