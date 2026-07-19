import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPlannerEventsAction } from '@/app/actions/planner';
import EventsClient from './EventsClient';

export default async function EventsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const res = await getPlannerEventsAction();
  if (!res.success) {
    return <div className="p-6 text-sm text-red-500">Failed to load events: {res.error}</div>;
  }

  const canManage = !!res.canManage;
  let projects: Array<{ id: string; name: string }> = [];
  let members: Array<{ id: string; name: string }> = [];
  if (canManage) {
    [projects, members] = await Promise.all([
      prisma.project.findMany({
        where: { organizationId: session.organizationId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { organizationId: session.organizationId, status: 'ACTIVE', role: { in: ['OWNER', 'MEMBER'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
  }

  return (
    <EventsClient
      events={res.events as any[]}
      canManage={canManage}
      projects={projects}
      members={members}
    />
  );
}
