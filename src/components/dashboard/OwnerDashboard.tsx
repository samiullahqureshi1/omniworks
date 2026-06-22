'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Clock, Users, Activity, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function OwnerDashboard({ metrics }: { metrics: any }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 mt-6">
      {/* KPI Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-slate-500">Total Projects</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <FolderKanban size={18} />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalProjects || 0}</div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span className="text-emerald-500 font-medium">+Active</span> across workspace
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-slate-500">Hours Logged</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
                <Clock size={18} />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalHours || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Total billable & internal</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-slate-500">Active Members</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100">
                <Users size={18} />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.totalUsers || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Registered accounts</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-md transition-shadow border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-sm font-medium text-slate-500">Recent Activity</CardTitle>
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                <Activity size={18} />
              </div>
            </CardHeader>
            <CardContent className="z-10 relative">
              <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{metrics.recentLogs?.length || 0}</div>
              <p className="text-xs text-slate-500 mt-1">Events in the last 7 days</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts & Activity */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Pipeline */}
        <motion.div variants={item} className="lg:col-span-4">
          <Card className="h-full border-none shadow-sm bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Project Pipeline
                <Link href="/workspace/projects" className="text-xs font-normal text-blue-500 hover:underline flex items-center">
                  View all <ExternalLink size={12} className="ml-1" />
                </Link>
              </CardTitle>
              <CardDescription>Current status distribution across your organization.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 pt-2">
                {Object.entries(metrics.projectStatusCounts || {}).map(([status, count]: any, idx: number) => {
                  const percentage = metrics.totalProjects > 0 ? (count / metrics.totalProjects) * 100 : 0;
                  const getStatusGradient = (s: string) => {
                    switch(s) {
                      case 'PLANNING': return 'bg-gradient-to-r from-slate-400 to-slate-500';
                      case 'IN_PROGRESS': return 'bg-gradient-to-r from-blue-400 to-blue-600';
                      case 'ON_HOLD': return 'bg-gradient-to-r from-amber-400 to-amber-500';
                      case 'COMPLETE': return 'bg-gradient-to-r from-emerald-400 to-emerald-500';
                      default: return 'bg-slate-500';
                    }
                  };

                  return (
                    <div key={status} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{status.replace('_', ' ')}</span>
                        <span className="text-slate-500 font-medium">{count} <span className="font-normal text-xs ml-1">({percentage.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1, delay: 0.2 + (idx * 0.1) }}
                          className={`h-full rounded-full ${getStatusGradient(status)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="h-full border-none shadow-sm bg-white dark:bg-slate-900">
            <CardHeader>
              <CardTitle>Recent Timesheets</CardTitle>
              <CardDescription>Latest team logging activity.</CardDescription>
            </CardHeader>
            <CardContent>
              {(!metrics.recentLogs || metrics.recentLogs.length === 0) ? (
                <div className="flex flex-col items-center justify-center h-48 text-center px-4">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                    <Activity size={24} />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No activity yet</p>
                  <p className="text-xs text-slate-400 mt-1">When your team logs time, it will appear here.</p>
                </div>
              ) : (
                <div className="space-y-5 pt-2">
                  {metrics.recentLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start group">
                      <Avatar className="h-8 w-8 border border-slate-200 shadow-sm mt-0.5">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-[10px] font-bold">
                          {log.user?.name.substring(0,2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-3 space-y-0.5 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                          {log.user?.name}
                        </p>
                        <p className="text-xs text-slate-500 leading-snug">
                          {log.description || 'Logged general time'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="ml-2 font-bold text-sm text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100/50">
                        +{log.hours}h
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
