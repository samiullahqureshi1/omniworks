import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { prisma } from '@/lib/db';
import WorkspaceLayoutClient from './WorkspaceLayoutClient';

import { ThemeProvider } from '@/components/ThemeProvider';

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/logout');
  }

  // Check if user is a PM for any project
  let isPM = false;
  if (user.role === 'MEMBER') {
    const pmProject = await prisma.project.findFirst({
      where: { projectManagerId: user.userId, organizationId: user.organizationId }
    });
    if (pmProject) isPM = true;
  }

  // Fetch all organizations this user belongs to
  const userRecords = await prisma.user.findMany({
    where: { email: user.email, status: 'ACTIVE' },
    include: { organization: true }
  });

  const userOrganizations = userRecords.map(u => ({
    id: u.organization.id,
    name: u.organization.name,
    role: u.role
  }));

  return (
    <ThemeProvider>
      <WorkspaceLayoutClient user={{...user, isPM}} userOrganizations={userOrganizations}>
        {children}
      </WorkspaceLayoutClient>
    </ThemeProvider>
  );
}
