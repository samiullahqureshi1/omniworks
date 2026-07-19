import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import MyCalendarClient from './MyCalendarClient';

export default async function MyCalendarPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  // Clients never see My Calendar.
  if (session.role === 'CLIENT') redirect('/workspace/planner/meetings');

  return <MyCalendarClient />;
}
