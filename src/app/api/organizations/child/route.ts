import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ error: 'Unauthorized. Only owners can create child organizations.' }, { status: 403 });
    }

    const { name } = await req.json();
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Organization name is required' }, { status: 400 });
    }

    // Get the base organization
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, email: true, name: true, organizationId: true, passwordHash: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is the owner of their base organization
    const parentOrg = await prisma.organization.findUnique({
      where: { id: user.organizationId }
    });

    if (!parentOrg || parentOrg.ownerUserId !== user.id) {
      return NextResponse.json({ error: 'You must be the owner of the main organization to create child organizations.' }, { status: 403 });
    }

    // Create the child organization
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);
    
    // We do this in a transaction: create org, then create the owner user inside it
    const result = await prisma.$transaction(async (tx) => {
      const childOrg = await tx.organization.create({
        data: {
          name: name.trim(),
          slug,
          ownerUserId: user.id,
          parentOrganizationId: parentOrg.id
        }
      });

      // The user needs an account in the child organization to access it properly
      await tx.user.create({
        data: {
          name: user.name,
          email: user.email,
          passwordHash: user.passwordHash,
          role: 'OWNER',
          organizationId: childOrg.id
        }
      });

      return childOrg;
    });

    return NextResponse.json({ success: true, organization: result });
  } catch (error: any) {
    console.error('Error creating child organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
