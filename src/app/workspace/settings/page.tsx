import React from 'react';
import { getCurrentUser } from '@/app/actions/auth';
import { prisma } from '@/lib/db';
import SecurityFormsClient from './SecurityFormsClient';

export const metadata = {
  title: 'Security Settings - Omniwork',
  description: 'Manage your security settings',
};

export default async function SettingsPage() {
  const sessionUser = await getCurrentUser();
  
  if (!sessionUser) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    select: { twoFactorEnabled: true }
  });

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Security Settings</h1>
        <p className="text-slate-500 dark:text-slate-400">Manage your password and two-factor authentication.</p>
      </div>

      <SecurityFormsClient initialTwoFactorEnabled={user.twoFactorEnabled} />
    </div>
  );
}
