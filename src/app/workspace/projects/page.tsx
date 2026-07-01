import React from 'react';
import { getProjectsAction } from '@/app/actions/projects';
import { getUsersAction } from '@/app/actions/users';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import ProjectsClient from './ProjectsClient';

export default async function ProjectsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const [projectsRes, usersRes, projectStatuses, taskStatuses] = await Promise.all([
    getProjectsAction(),
    getUsersAction(), // We need users to populate the PM/Client dropdowns for Owners
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
    return <div className="p-6 text-destructive flex items-center justify-center h-64 border rounded-xl bg-background mt-6">Error loading projects: {projectsRes.error}</div>;
  }

  const projects = projectsRes.projects || [];
  const users = usersRes.success ? (usersRes.users || []) : [];

  return <ProjectsClient initialProjects={projects} users={users} currentUser={currentUser} projectStatuses={projectStatuses} taskStatuses={taskStatuses} />;
}
