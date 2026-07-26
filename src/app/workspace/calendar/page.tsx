import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import MyCalendarClient from '../planner/calendar/MyCalendarClient';

export default async function MainCalendarPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role === 'CLIENT') redirect('/workspace/planner/meetings');

  return <MyCalendarClient mode="all" />;
}
