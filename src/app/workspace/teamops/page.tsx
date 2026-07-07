import React from 'react';
import { getTeamOpsProjectsAction } from '@/app/actions/teamops';
import { getUsersAction } from '@/app/actions/users';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import TeamOpsClient from './TeamOpsClient';

export default async function TeamOpsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  if (currentUser.role === 'CLIENT') {
    redirect('/workspace');
  }

  const [projectsRes, usersRes, projectStatuses, taskStatuses] = await Promise.all([
    getTeamOpsProjectsAction(),
    getUsersAction(),
    prisma.projectStatus.findMany({
      where: { organizationId: currentUser.organizationId },
      orderBy: { order: 'asc' }
    }),
    prisma.taskStatus.findMany({
      where: { organizationId: currentUser.organizationId },
      orderBy: { order: 'asc' }
    })
  ]);

  if (!projectsRes.success) {
    return (
      <div className="p-6 text-destructive flex items-center justify-center h-64 border rounded-xl bg-background mt-6">
        Error loading TeamOps Hub: {projectsRes.error}
      </div>
    );
  }

  const projects = projectsRes.projects || [];
  const users = usersRes.success ? (usersRes.users || []) : [];

  return (
    <TeamOpsClient
      initialProjects={projects}
      users={users}
      currentUser={currentUser}
      projectStatuses={projectStatuses}
      taskStatuses={taskStatuses}
    />
  );
}
