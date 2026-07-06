import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { projectId } = await context.params;

    // Verify access
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: session.organizationId,
        ...(session.role === 'CLIENT' ? { clientId: session.userId } : {}),
        ...(session.role === 'MEMBER' ? {
          OR: [
            { tasks: { some: { assignees: { some: { userId: session.userId } } } } },
            { projectManagerId: session.userId },
          ]
        } : {})
      },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, role: true } } } },
        projectManager: { select: { id: true, name: true, role: true } },
        client: { select: { id: true, name: true, role: true } }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Determine users we can mention
    const users = [];

    // Admins/Owners in organization
    const owners = await prisma.user.findMany({
      where: { organizationId: session.organizationId, role: 'OWNER', status: 'ACTIVE' },
      select: { id: true, name: true, role: true }
    });
    users.push(...owners);

    if (project.projectManager) users.push(project.projectManager);
    users.push(...project.assignees.map(a => a.user));
    
    // Include client if we want them to be mentionable (usually yes, if message is public)
    if (project.client) users.push(project.client);

    // Deduplicate
    const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());

    // Fetch tasks for the project
    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: { id: true, title: true, status: { select: { name: true } } }
    });

    return NextResponse.json({ users: uniqueUsers, tasks });
  } catch (error: any) {
    console.error('Fetch mention suggestions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
