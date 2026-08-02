import React from 'react';
import { getUsersAction } from '@/app/actions/users';
import { getCurrentUser } from '@/app/actions/auth';
import { can } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect('/login');

  // Direct URL access is blocked without USER_VIEW (OWNER/MASTER_ADMIN always pass).
  if (!can(currentUser, 'USER_VIEW')) {
    redirect('/workspace');
  }

  const res = await getUsersAction();
  if (!res.success) {
    return <div className="p-6 text-destructive flex items-center justify-center h-64 border rounded-xl bg-background mt-6">Error loading users: {res.error}</div>;
  }

  const users = res.users || [];

  return <UsersClient initialUsers={users} currentUser={currentUser} />;
}
