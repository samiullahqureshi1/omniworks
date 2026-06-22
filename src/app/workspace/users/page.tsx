import React from 'react';
import { getUsersAction } from '@/app/actions/users';
import { getCurrentUser } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser || currentUser.role !== 'OWNER') {
    redirect('/workspace');
  }

  const res = await getUsersAction();
  if (!res.success) {
    return <div className="p-6 text-destructive flex items-center justify-center h-64 border rounded-xl bg-background mt-6">Error loading users: {res.error}</div>;
  }

  const users = res.users || [];

  return <UsersClient initialUsers={users} currentUser={currentUser} />;
}
