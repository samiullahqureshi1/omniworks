import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/permissions';
import MyCalendarClient from './MyCalendarClient';

export default async function MyCalendarPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  // Direct URL access requires the module's VIEW permission.
  if (!can(session, 'CALENDAR_VIEW')) redirect('/workspace/planner/meetings');
  // Clients never see My Calendar.
  if (session.role === 'CLIENT') redirect('/workspace/planner/meetings');

  return <MyCalendarClient mode="plannerOnly" />;
}
