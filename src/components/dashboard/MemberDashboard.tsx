'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Clock, Users, Activity, ExternalLink, ListTodo, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatHours } from '@/lib/utils';

export default function MemberDashboard({ metrics }: { metrics: any }) {
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

  // Prepare dynamic data
  const totalProjects = metrics?.totalProjects || 0;
  const myTasks = metrics?.myTasks || [];
  const totalHours = metrics?.totalHours || 0;
  const recentLogs = metrics?.recentLogs || [];
  const assignedProjects = metrics?.assignedProjects || [];
  
  // Calculate daily activity for the chart based on recent logs (last 7 days)
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dailyHours = [0, 0, 0, 0, 0, 0, 0];
  let maxDailyHour = 1;
  
  recentLogs.forEach((log: any) => {
    if (log.startTime) {
      const date = new Date(log.startTime);
      const dayIdx = date.getDay();
      const hours = (log.activeWorkedDuration || 0) / 3600;
      dailyHours[dayIdx] += hours;
      if (dailyHours[dayIdx] > maxDailyHour) maxDailyHour = dailyHours[dayIdx];
    }
  });

  const todayIdx = new Date().getDay();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col xl:flex-row gap-6 mt-2">
      {/* Left Column: ~30% */}
      <div className="xl:w-[340px] shrink-0 flex flex-col gap-6">
        
        {/* Activity / Hours Logged Large Card */}
        <motion.div variants={item}>
          <Card className="h-full border-none shadow-sm relative overflow-hidden flex flex-col bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2 z-10 relative">
              <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                <Clock className="h-6 w-6" /> Activity
              </CardTitle>
              <div className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1f1f1f] text-sm font-semibold flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Activity className="h-4 w-4" /> This Week
              </div>
            </CardHeader>
            <CardContent className="z-10 relative flex-1 flex flex-col pt-4">
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-[56px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">{formatHours(totalHours)}</span>
                <span className="text-base text-slate-500 font-medium">Hours</span>
              </div>
              
              {/* Dynamic Bar Chart Representation */}
              <div className="flex items-end justify-between h-[180px] w-full mt-auto mb-2 px-1">
                {days.map((day, i) => {
                  const hours = dailyHours[i];
                  const heightPercent = Math.max(10, (hours / maxDailyHour) * 100);
                  const isToday = i === todayIdx;
                  
                  return (
                    <div key={day} className="flex flex-col items-center gap-4">
                      <div className="relative w-12 flex flex-col justify-end h-[140px]">
                        <div 
                          className={`w-full rounded-full transition-all duration-1000 ease-out relative ${
                            isToday ? 'bg-[#ef6b33]' : 'overflow-hidden border border-slate-200 dark:border-slate-700/50'
                          }`}
                          style={{ 
                            height: `${heightPercent}%`,
                            ...(isToday ? {} : {
                              background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(203, 213, 225, 0.4) 4px, rgba(203, 213, 225, 0.4) 5px)'
                            })
                          }}
                        >
                          {isToday && (
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 flex items-center">
                              <div className="w-4 h-4 rounded-full bg-[#ef6b33] border-[3px] border-white dark:border-[#1f1f1f] shadow-sm"></div>
                              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-1 bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-semibold px-2 py-1 rounded-md shadow-sm whitespace-nowrap">
                                {formatHours(hours)} Hours
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-slate-400 font-medium">{day}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Today to-do list */}
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                <ListTodo className="h-6 w-6" /> Today to-do list
              </CardTitle>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">No tasks assigned</div>
              ) : (
                <div className="space-y-4">
                  {myTasks.slice(0, 4).map((task: any, idx: number) => {
                    const isDone = task.status?.name?.toUpperCase() === 'DONE';
                    const iconBg = idx % 4 === 0 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' :
                                   idx % 4 === 1 ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500' :
                                   idx % 4 === 2 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' :
                                   'bg-green-50 dark:bg-green-900/20 text-green-500';
                    return (
                      <div key={task.id} className="flex items-center gap-4 p-4 bg-white dark:bg-[#181818] rounded-[24px] border border-slate-100 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <div className={`h-12 w-12 shrink-0 rounded-[16px] flex items-center justify-center ${iconBg}`}>
                          <FolderKanban size={20} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-base font-bold text-slate-900 dark:text-white truncate">{task.title}</span>
                          <span className="text-sm text-slate-400 truncate font-medium">{task.project?.name || 'No Project'}</span>
                        </div>
                        <div className="shrink-0 flex items-center justify-center">
                          {isDone ? (
                            <div className="h-7 w-7 rounded-full bg-[#ef6b33] flex items-center justify-center text-white">
                              <CheckCircle2 size={16} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="h-7 w-7 rounded-full border-[3px] border-slate-200 dark:border-slate-700"></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Right Column: ~70% */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Top Row: Stat Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={item}>
            <Card className="h-full border-none shadow-sm flex flex-col justify-center bg-white dark:bg-[#1f1f1f] rounded-[28px]">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">My Projects</span>

                </div>
                <div className="flex items-end justify-between">
                  <span className="text-[40px] font-bold text-slate-900 dark:text-white leading-none">{totalProjects}</span>
                  <span className="text-emerald-500 text-sm font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">+Active</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full border-none shadow-sm flex flex-col justify-center bg-white dark:bg-[#1f1f1f] rounded-[28px]">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">My Tasks</span>
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                    <span className="block mb-2 font-bold tracking-widest">...</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-[40px] font-bold text-slate-900 dark:text-white leading-none">{myTasks.length}</span>
                  <span className="text-emerald-500 text-sm font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">Total</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full border-none shadow-sm flex flex-col justify-center bg-white dark:bg-[#1f1f1f] rounded-[28px]">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Hours Logged</span>
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                    <span className="block mb-2 font-bold tracking-widest">...</span>
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-[40px] font-bold text-slate-900 dark:text-white leading-none">{formatHours(totalHours)}</span>
                  <span className="text-blue-500 text-sm font-bold bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full">Overall</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full border-none shadow-sm overflow-hidden relative bg-white dark:bg-[#1f1f1f] rounded-[28px]">
              <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-[#f1a46e] rounded-full opacity-40 blur-2xl pointer-events-none"></div>
              <CardContent className="p-6 flex flex-col justify-start h-full relative z-10">
                <span className="text-sm font-bold text-slate-500 mb-1">Nadi AI</span>
                <span className="text-[17px] leading-snug font-bold text-slate-900 dark:text-white max-w-[120px]">
                  Experience The<br/>Power Of Simplicity
                </span>
                <div className="absolute right-0 bottom-0 w-24 h-24 bg-[#ef6b33] rounded-tl-full opacity-90 shadow-inner overflow-hidden">
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-yellow-300/30 to-transparent"></div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Middle Row: Task Timeline */}
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                <FolderKanban className="h-6 w-6" /> Assigned Projects
              </CardTitle>

            </CardHeader>
            <CardContent>
              <div className="relative h-[240px] w-full pt-4">
                {/* Background Grid */}
                <div className="absolute inset-0 flex justify-between px-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-full w-px bg-slate-100 dark:bg-slate-800/50 border-r border-dashed border-slate-200 dark:border-slate-800"></div>
                  ))}
                </div>

                {assignedProjects.length === 0 ? (
                  <div className="relative z-10 h-full flex items-center justify-center text-slate-500">No active assigned projects.</div>
                ) : (
                  <div className="relative z-10 h-full flex flex-col justify-around py-4">
                    {assignedProjects.slice(0, 4).map((project: any, idx: number) => {
                      const getStyle = (s: string) => {
                        switch(s) {
                          case 'PLANNING': return 'bg-[#fdf2e9] dark:bg-[#e08936]/20 text-[#e08936] border-[#e08936]/30';
                          case 'IN_PROGRESS': return 'bg-[#fdf4db] dark:bg-[#d69f12]/20 text-[#d69f12] border-[#d69f12]/30';
                          case 'ON_HOLD': return 'bg-[#ffebee] dark:bg-[#e53935]/20 text-[#e53935] border-[#e53935]/30';
                          case 'COMPLETE': return 'bg-[#e9faef] dark:bg-[#2db366]/20 text-[#2db366] border-[#2db366]/30';
                          default: return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700';
                        }
                      };

                      // Fake dynamic percentage for straight bar visual
                      const widthPercent = [80, 50, 60, 40][idx % 4];

                      return (
                        <div key={project.id} className="relative w-full h-14 group flex items-center">
                          <div 
                            className={`h-[40px] rounded-full flex items-center px-4 justify-between border shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${getStyle(project.status)}`}
                            style={{ width: `${widthPercent}%`, minWidth: 'fit-content' }}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-sm font-bold truncate leading-none">{project.name}</span>
                            </div>
                            <span className="font-bold text-[10px] uppercase tracking-wider bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full shrink-0 ml-3">{project.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Bottom Row: Recent Timesheets */}
        <div className="grid gap-6 lg:grid-cols-1">
          
          <motion.div variants={item}>
            <Card className="h-full border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
              <CardHeader className="flex flex-row items-center justify-between pb-6">
                <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                  <Activity className="h-6 w-6" /> Recent Logs
                </CardTitle>
                <div className="px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1f1f1f] text-sm font-semibold flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="h-4 w-4" /> Activity
                </div>
              </CardHeader>
              <CardContent>
                {recentLogs.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">No recent logs found.</div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {recentLogs.slice(0, 3).map((log: any, idx: number) => (
                      <div key={log.id} className="flex flex-col p-5 bg-[#fbfaf7] dark:bg-[#181818] rounded-[24px] border border-slate-100 dark:border-white/5 h-full">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-slate-500">
                            {new Date(log.startTime || log.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-md shadow-sm border border-emerald-100 dark:border-emerald-800">
                             <Clock size={10} /> +{formatHours((log.activeWorkedDuration || 0) / 3600)}h
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-base mb-2 truncate">{log.member?.name || log.user?.name || 'Unknown'}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">
                          {log.description || log.task?.title || 'General time logged.'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
        
      </div>
    </motion.div>
  );
}
