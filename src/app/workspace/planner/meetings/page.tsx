import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPlannerMeetingsAction } from '@/app/actions/planner';
import MeetingsClient from './MeetingsClient';

export default async function MeetingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const res = await getPlannerMeetingsAction();
  if (!res.success) {
    return <div className="p-6 text-sm text-red-500">Failed to load meetings: {res.error}</div>;
  }

  const [projects, members] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: session.organizationId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.user.findMany({
      where: { organizationId: session.organizationId, status: 'ACTIVE' },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <MeetingsClient
      meetings={res.meetings as any[]}
      role={res.role!}
      projects={projects}
      members={members}
    />
  );
}
