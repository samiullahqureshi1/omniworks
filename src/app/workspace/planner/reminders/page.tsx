import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { getRemindersAction } from '@/app/actions/planner';
import RemindersClient from './RemindersClient';

export default async function RemindersPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  // Direct URL access requires the module's VIEW permission.
  if (!can(session, 'REMINDER_VIEW')) redirect('/workspace');
  if (session.role === 'CLIENT') redirect('/workspace/planner/meetings');

  const res = await getRemindersAction();
  if (!res.success) {
    return <div className="p-6 text-sm text-red-500">Failed to load reminders: {res.error}</div>;
  }

  const canManage =
    can(session, 'REMINDER_CREATE') || can(session, 'REMINDER_EDIT') || can(session, 'REMINDER_DELETE');

  return <RemindersClient reminders={res.reminders as any[]} canManage={canManage} />;
}
