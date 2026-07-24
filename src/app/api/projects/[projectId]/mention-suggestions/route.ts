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

    // Determine users we can mention (Project Manager, Project Assignees, Client, and Task Assignees of this project)
    const users = [];

    if (project.projectManager) users.push(project.projectManager);
    if (project.assignees) users.push(...project.assignees.map(a => a.user));
    if (project.client) users.push(project.client);

    // Fetch all task assignees for tasks in this project
    const taskAssignees = await prisma.taskAssignee.findMany({
      where: {
        task: {
          projectId: projectId
        }
      },
      select: {
        user: {
          select: { id: true, name: true, role: true }
        }
      }
    });
    users.push(...taskAssignees.map(ta => ta.user));

    // Deduplicate, and don't suggest the current user (you can't mention yourself)
    const uniqueUsersMap = new Map(users.map(u => [u.id, u]));
    uniqueUsersMap.delete(session.userId);
    const uniqueUsers = Array.from(uniqueUsersMap.values());

    // Fetch tasks for the project
    const tasks = await prisma.task.findMany({
      where: { projectId },
      select: { id: true, title: true, status: { select: { name: true } } }
    });

    return NextResponse.json({ users: uniqueUsers, tasks, projectName: project.name });
  } catch (error: any) {
    console.error('Fetch mention suggestions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
