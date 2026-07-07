import React from 'react';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ProjectDetailClient from './ProjectDetailClient';

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { id } = await params;

  // Verify access based on role
  let whereClause: any = { id, organizationId: session.organizationId };
  if (session.role === 'CLIENT') {
    whereClause.clientId = session.userId;
  } else if (session.role === 'MEMBER') {
    whereClause.OR = [
      { tasks: { some: { assignees: { some: { userId: session.userId } } } } },
      { projectManagerId: session.userId },
    ];
  }

  const project = await prisma.project.findFirst({
    where: whereClause,
    include: {
      client: { select: { id: true, name: true, email: true } },
      projectManager: { select: { id: true, name: true, email: true } },
      status: true,
      rules: {
        include: {
          rule: true
        }
      },
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      },
      tasks: {
        orderBy: { createdAt: 'desc' },
        include: {
          assignees: {
            include: { user: { select: { id: true, name: true } } }
          },
          status: true
        }
      },
      timeEntries: {
        orderBy: { startTime: 'desc' },
        include: {
          member: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } }
        }
      }
    },
  });

  const projectStatuses = await prisma.projectStatus.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { order: 'asc' }
  });

  if (!project) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Project Not Found</h2>
        <p className="text-muted-foreground mt-2">The project might have been deleted, or you don't have permission to view it.</p>
      </div>
    );
  }

  const isStrictMember = session.role === 'MEMBER' && session.userId !== project.projectManagerId;

  if (isStrictMember) {
    // API Requirement: Member users do not see project-level total hours
    (project as any).totalAllocatedHours = null;
  }

  // Also fetch timesheets related to this project's tasks or direct tracking.
  // Wait, our timesheet model is daily. TimeTrackings link to projects.
  // We can just rely on the timeTrackings array included above for detailed logs.

  const users = await prisma.user.findMany({
    where: { organizationId: session.organizationId },
    select: { id: true, name: true, email: true, role: true, status: true, presence: true }
  });

  const taskStatuses = await prisma.taskStatus.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { order: 'asc' }
  });

  return <ProjectDetailClient project={project} currentUser={session} users={users} taskStatuses={taskStatuses} projectStatuses={projectStatuses} />;
}
