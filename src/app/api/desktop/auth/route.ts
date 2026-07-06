import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-desktop-secret-key-123';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Find active user
    const users = await prisma.user.findMany({
      where: { email, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];

    // Verify Password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role, organizationId: user.organizationId },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Fetch user's assigned projects and tasks for the desktop UI
    const rawProjects = await prisma.project.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { assignees: { some: { userId: user.id } } },
          { tasks: { some: { assignees: { some: { userId: user.id } } } } },
          { projectManagerId: user.id },
          ...(user.role === 'OWNER' ? [{}] : []),
        ]
      },
      include: {
        status: true,
        tasks: {
          where: {
            OR: [
              { assignees: { some: { userId: user.id } } },
              ...(user.role === 'OWNER' ? [{}] : [])
            ]
          },
          select: { id: true, title: true, statusId: true }
        }
      }
    });

    // Filter out completed projects
    const projects = rawProjects.filter(p => {
      const s = p.status?.name?.toLowerCase() || '';
      return !s.includes('complete') && !s.includes('done');
    });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId
      },
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        tasks: p.tasks
      }))
    });

  } catch (error: any) {
    console.error('Desktop auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
