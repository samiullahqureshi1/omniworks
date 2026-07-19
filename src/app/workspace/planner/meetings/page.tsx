import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getPlannerMeetingsAction } from '@/app/actions/planner';
import MeetingsClient from './MeetingsClient';

export default async function MeetingsPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const res = await getPlannerMeetingsAction();
  if (!res.success) {
    return <div className="p-6 text-sm text-red-500">Failed to load meetings: {res.error}</div>;
  }

  return <MeetingsClient meetings={res.meetings as any[]} role={res.role!} />;
}
