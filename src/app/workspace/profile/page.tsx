import React from 'react';
import { getCurrentUser } from '@/app/actions/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Building2, Mail, Shield, CircleUserRound, Clock, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'My Profile - Omniwork',
  description: 'Manage your profile and account settings',
};

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  
  if (!sessionUser) {
    return null; // Layout handles redirect
  }

  // Fetch full user details
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.userId },
    include: {
      organization: true,
      _count: {
        select: {
          taskAssignees: true,
          timeEntries: true,
          managedProjects: true,
        }
      }
    }
  });

  if (!user) return null;

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-500 dark:text-slate-400">View your personal information and statistics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <Card className="col-span-1 border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-purple-500/20 to-amber-500/20 w-full" />
          <div className="px-6 pb-6 -mt-16 flex flex-col items-center text-center">
            <Avatar className="h-32 w-32 border-4 border-white dark:border-[#1f1f1f] shadow-lg mb-4">
              <AvatarFallback className="bg-gradient-to-br from-[#f0bd5e] to-[#e0a843] text-white text-4xl font-bold">
                {user.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{user.name}</h2>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full mb-4">
              <Shield size={14} /> {user.role}
            </div>
            
            <div className="w-full flex flex-col gap-3 mt-4 text-left border-t border-slate-100 dark:border-slate-800/60 pt-6">
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Mail size={16} className="text-slate-400" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Email</span>
                  <span className="text-sm font-medium truncate">{user.email}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-slate-400" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Organization</span>
                  <span className="text-sm font-medium truncate">{user.organization.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0">
                  <CircleUserRound size={16} className="text-slate-400" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Status</span>
                  <span className="text-sm font-medium truncate">{user.status}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column: Stats & Activity */}
        <div className="col-span-1 lg:col-span-2 flex flex-col gap-6">
          <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px]">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <CardTitle className="text-lg">Activity Overview</CardTitle>
              <CardDescription>Your lifetime statistics within {user.organization.name}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                  <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1">{user._count.taskAssignees}</span>
                  <span className="text-sm font-semibold text-slate-500">Tasks Assigned</span>
                </div>

                <div className="flex flex-col p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <Clock size={20} />
                    </div>
                  </div>
                  <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1">{user._count.timeEntries}</span>
                  <span className="text-sm font-semibold text-slate-500">Time Entries</span>
                </div>

                <div className="flex flex-col p-5 bg-slate-50 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                  </div>
                  <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-1">{user._count.managedProjects}</span>
                  <span className="text-sm font-semibold text-slate-500">Managed Projects</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] flex-1">
             <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800/60">
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Account Created</h3>
                    <p className="text-sm text-slate-500">Member since {new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                 </div>
                 <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Timezone</h3>
                    <p className="text-sm text-slate-500">Automatically synced with your device.</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
