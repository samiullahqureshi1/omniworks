import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request, context: { params: Promise<{ taskId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { taskId } = await context.params;

    // Verify access and get project details
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId: session.organizationId,
      },
      include: {
        project: {
          include: {
            client: { select: { id: true, name: true, role: true } },
            projectManager: { select: { id: true, name: true, role: true } },
            assignees: {
              include: { user: { select: { id: true, name: true, role: true } } }
            },
            tasks: {
              include: {
                assignees: {
                  include: { user: { select: { id: true, name: true, role: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    const project = task.project;
    const usersMap = new Map<string, { id: string; name: string; role: string; type: string }>();

    // 1. Add Client
    if (project.client) {
      usersMap.set(project.client.id, { ...project.client, type: 'Client' });
    }

    // 2. Add Project Manager
    if (project.projectManager) {
      usersMap.set(project.projectManager.id, { ...project.projectManager, type: 'Project Manager' });
    }

    // 3. Add Project Assignees
    project.assignees.forEach((a: any) => {
      if (a.user && !usersMap.has(a.user.id)) {
        usersMap.set(a.user.id, { ...a.user, type: 'Project Member' });
      }
    });

    // 4. Add all Task Assignees in the project
    project.tasks.forEach((t: any) => {
      t.assignees.forEach((a: any) => {
        if (a.user && !usersMap.has(a.user.id)) {
          usersMap.set(a.user.id, { ...a.user, type: 'Task Assignee' });
        }
      });
    });

    // Don't suggest the current user
    usersMap.delete(session.userId);

    const suggestions = Array.from(usersMap.values()).map(u => ({
      id: u.id,
      display: u.name,
      role: u.role,
      type: u.type
    }));

    // Sort by name
    suggestions.sort((a, b) => (a.display || '').localeCompare(b.display || ''));

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Fetch mention suggestions error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
