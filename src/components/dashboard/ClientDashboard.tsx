'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Clock, Users, Activity, ExternalLink, ListTodo, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatHours } from '@/lib/utils';

export default function ClientDashboard({ metrics }: { metrics: any }) {
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
  const totalHours = metrics?.totalHours || 0;
  const projects = metrics?.projects || [];
  
  // Extract all tasks from all client projects
  const clientTasks = projects.flatMap((p: any) => p.tasks || []);
  const completedTasks = clientTasks.filter((t: any) => t.statusId === 'COMPLETE' || t.status?.name === 'DONE').length;

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
                <Activity className="h-4 w-4" /> Overall
              </div>
            </CardHeader>
            <CardContent className="z-10 relative flex-1 flex flex-col pt-4">
              <div className="flex items-baseline gap-2 mb-10">
                <span className="text-[56px] font-bold text-slate-900 dark:text-white leading-none tracking-tight">{formatHours(totalHours)}</span>
                <span className="text-base text-slate-500 font-medium">Hours</span>
              </div>
              
              {/* Dynamic Summary Representation */}
              <div className="flex items-end justify-between h-[180px] w-full mt-auto mb-2 px-1">
                <div className="flex flex-col justify-end items-center gap-4 w-full">
                  <div className="w-full flex justify-between px-4 font-semibold text-slate-500 mb-2">
                    <span>{clientTasks.length} Total Tasks</span>
                    <span>{completedTasks} Completed</span>
                  </div>
                  <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-[#ef6b33] transition-all duration-1000 ease-out" 
                      style={{ width: `${clientTasks.length > 0 ? (completedTasks / clientTasks.length) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Client Projects List */}
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                <FolderKanban className="h-6 w-6" /> My Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500">No projects found</div>
              ) : (
                <div className="space-y-4">
                  {projects.slice(0, 4).map((project: any, idx: number) => {
                    const iconBg = idx % 4 === 0 ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500' :
                                   idx % 4 === 1 ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' :
                                   idx % 4 === 2 ? 'bg-green-50 dark:bg-green-900/20 text-green-500' :
                                   'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-500';
                    return (
                      <div key={project.id} className="flex items-center gap-4 p-4 bg-white dark:bg-[#181818] rounded-[24px] border border-slate-100 dark:border-white/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                        <div className={`h-12 w-12 shrink-0 rounded-[16px] flex items-center justify-center ${iconBg}`}>
                          <FolderKanban size={20} />
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-base font-bold text-slate-900 dark:text-white truncate">{project.name}</span>
                          <span className="text-sm text-slate-400 truncate font-medium">{project.status?.replace('_', ' ') || 'ACTIVE'}</span>
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
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Total Project</span>

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
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Total Tasks</span>

                </div>
                <div className="flex items-end justify-between">
                  <span className="text-[40px] font-bold text-slate-900 dark:text-white leading-none">{clientTasks.length}</span>
                  <span className="text-emerald-500 text-sm font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">Overall</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="h-full border-none shadow-sm flex flex-col justify-center bg-white dark:bg-[#1f1f1f] rounded-[28px]">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">Total Hours</span>

                </div>
                <div className="flex items-end justify-between">
                  <span className="text-[40px] font-bold text-slate-900 dark:text-white leading-none">{formatHours(totalHours)}</span>
                  <span className="text-blue-500 text-sm font-bold bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full">Logged</span>
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

        {/* Middle Row: Task Timeline (Client Projects) */}
        <motion.div variants={item}>
          <Card className="border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                <ListTodo className="h-6 w-6" /> Project Timeline
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

                {projects.length === 0 ? (
                  <div className="relative z-10 h-full flex items-center justify-center text-slate-500">No active projects to display.</div>
                ) : (
                  <div className="relative z-10 h-full flex flex-col justify-around py-4">
                    {projects.map((project: any, idx: number) => {
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
                            <span className="font-bold text-[10px] uppercase tracking-wider bg-white/50 dark:bg-black/20 px-2 py-1 rounded-full shrink-0 ml-3">{project.status?.replace('_', ' ')}</span>
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


      </div>
    </motion.div>
  );
}
