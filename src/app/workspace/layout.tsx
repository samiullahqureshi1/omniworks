import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { prisma } from '@/lib/db';
import WorkspaceLayoutClient from './WorkspaceLayoutClient';

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

  return (
    <WorkspaceLayoutClient user={{...user, isPM}}>
      {children}
    </WorkspaceLayoutClient>
  );
}
