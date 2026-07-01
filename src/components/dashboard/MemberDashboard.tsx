'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, CheckCircle2, Clock, Zap, Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatHours } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function MemberDashboard({ metrics }: { metrics: any }) {
  const router = useRouter();

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

  const totalProjects = metrics?.totalProjects || 0;
  const myTasks = metrics?.myTasks || [];
  const totalHours = metrics?.totalHours || 0;
  const trends = metrics?.trends || {};
  const activityData = metrics?.activityData || [];

  const completedTasksCount = myTasks.filter((t: any) => t.status?.name?.toLowerCase().includes('done') || t.status?.name?.toLowerCase().includes('complete')).length;
  const totalTasksCount = myTasks.length;
  const remainingTasksCount = totalTasksCount - completedTasksCount;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Trend Calculations
  const calcTrend = (current: number, past: number) => {
    if (past === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - past) / past) * 100);
  };

  const tasksTrend = calcTrend(trends.tasksCreatedThisWeek || 0, trends.tasksCreatedLastWeek || 0);
  const completedTrend = calcTrend(trends.tasksCompletedThisWeek || 0, trends.tasksCompletedLastWeek || 0);
  const hoursTrend = calcTrend(totalHours, metrics?.hoursLastWeek || 0);
  const prodTrend = calcTrend(trends.productivityScore || 0, trends.productivityScoreLastWeek || 0);

  const formatTrend = (val: number) => {
    const isPos = val >= 0;
    return {
      text: `${isPos ? '↑' : '↓'} ${Math.abs(val)}% vs last week`,
      colorClass: isPos ? 'text-emerald-500' : 'text-rose-500'
    };
  };

  const tTasksTrend = formatTrend(tasksTrend);
  const cTasksTrend = formatTrend(completedTrend);
  const hLoggedTrend = formatTrend(hoursTrend);
  const pScoreTrend = formatTrend(prodTrend);

  const formatTime = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
      case 'medium': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('progress')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    if (s.includes('schedule') || s.includes('todo') || s.includes('plan')) return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    if (s.includes('pending') || s.includes('hold')) return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
    if (s.includes('done') || s.includes('complete')) return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  };

  const getProgressVal = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('done') || s.includes('complete')) return 100;
    if (s.includes('progress')) return 60;
    if (s.includes('pending') || s.includes('hold')) return 25;
    return 0;
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6 mt-2 w-full max-w-[1400px] mx-auto text-slate-900 dark:text-white">
      
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Tasks */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <ClipboardList className="text-blue-500 w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Total Tasks</span>
                <span className="text-3xl font-bold mb-2">{totalTasksCount}</span>
                <span className={`text-xs font-semibold ${tTasksTrend.colorClass}`}>{tTasksTrend.text}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${totalTasksCount === 0 ? 0 : (completedTasksCount/totalTasksCount)*100}%` }}></div>
              </div>
              <span className="text-xs text-slate-500 text-right font-medium">{remainingTasksCount} remaining</span>
            </div>
          </Card>
        </motion.div>

        {/* Completed Tasks */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="text-emerald-500 w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Completed Tasks</span>
                <span className="text-3xl font-bold mb-2">{completedTasksCount}</span>
                <span className={`text-xs font-semibold ${cTasksTrend.colorClass}`}>{cTasksTrend.text}</span>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${completionRate}%` }}></div>
              </div>
              <span className="text-xs text-slate-500 font-medium">{completionRate}% completion rate</span>
            </div>
          </Card>
        </motion.div>

        {/* Hours Logged */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                  <Clock className="text-purple-500 w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Hours Logged</span>
                  <span className="text-3xl font-bold mb-2 whitespace-nowrap">{formatTime(totalHours)}</span>
                  <span className={`text-xs font-semibold ${hLoggedTrend.colorClass}`}>{hLoggedTrend.text}</span>
                </div>
              </div>
              <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path className="text-slate-100 dark:text-slate-800" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-blue-600" strokeWidth="4" strokeDasharray="75, 100" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <span className="absolute text-xs font-bold text-slate-700 dark:text-white">75%</span>
              </div>
            </div>
            <div className="mt-2 text-right">
              <span className="text-xs text-slate-500 font-medium">of weekly goal</span>
            </div>
          </Card>
        </motion.div>

        {/* Productivity Score */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                  <Zap className="text-orange-500 w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Productivity Score</span>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">{trends.productivityScore || 87}</span>
                    <span className="text-sm text-slate-400 font-medium">/100</span>
                  </div>
                  <span className={`text-xs font-semibold ${pScoreTrend.colorClass}`}>{pScoreTrend.text}</span>
                </div>
              </div>
              <div className="w-16 h-10 ml-2 mt-2">
                <svg viewBox="0 0 100 40" className="w-full h-full stroke-orange-400 fill-none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0,30 L10,20 L20,35 L35,10 L45,25 L60,5 L75,20 L90,10 L100,25" />
                </svg>
              </div>
            </div>
            <div className="mt-2 text-right">
              <span className="inline-flex items-center justify-center px-3 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-xs font-bold gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Excellent
              </span>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Middle Row: Today's Tasks & Activity Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
        
        {/* Today's Tasks Table */}
        <motion.div variants={item} className="flex flex-col">
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1f1f1f] rounded-2xl flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Today's Tasks</CardTitle>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">{myTasks.length}</span>
              </div>
              <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                View all tasks <ChevronDown size={14} />
              </button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto flex-1">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50 dark:bg-[#181818]/50">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Task</th>
                    <th className="px-5 py-3 font-semibold text-center">Priority</th>
                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                    <th className="px-5 py-3 font-semibold text-center">Due Time</th>
                    <th className="px-5 py-3 font-semibold w-32">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {myTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No tasks assigned today.</td>
                    </tr>
                  ) : myTasks.slice(0, 5).map((task: any) => {
                    const progress = getProgressVal(task.status?.name);
                    const isDone = progress === 100;
                    return (
                      <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => router.push(`/workspace/tasks?edit=${task.id}`)}>
                        <td className="px-5 py-3.5 flex items-center gap-3">
                          <button className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isDone ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}>
                            {isDone && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                          </button>
                          <div className="flex flex-col min-w-[200px]">
                            <span className={`font-bold text-slate-900 dark:text-white truncate ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{task.title}</span>
                            <span className="text-[11px] text-slate-400 truncate">{task.project?.name || 'No Project'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                              {task.priority || 'MEDIUM'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${getStatusColor(task.status?.name)}`}>
                              {(task.status?.name || 'To Do').replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center text-slate-600 dark:text-slate-300 font-medium">
                          {task.dueDate ? new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No Time'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-8">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/50">
                <button className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline" onClick={() => router.push('/workspace/tasks')}>
                  <Plus size={16} /> Add new task
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Overview */}
        <motion.div variants={item} className="flex flex-col">
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1f1f1f] rounded-2xl flex flex-col p-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Activity Overview</h3>
              <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                This Week <ChevronDown size={14} />
              </button>
            </div>
            
            <div className="flex items-center justify-center gap-6 mb-6 text-sm font-semibold">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </span> Tasks Created
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                  <div className="w-1 h-1 bg-white rounded-full"></div>
                </span> Tasks Completed
              </div>
            </div>

            <div className="flex-1 w-full h-[200px] min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-100 dark:text-slate-800" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} dx={-10} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-colors-white)', color: '#0f172a' }}
                    itemStyle={{ fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="created" name="Tasks Created" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCreated)" activeDot={{ r: 4, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="completed" name="Tasks Completed" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" activeDot={{ r: 4, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/50">
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-semibold mb-1">Tasks Created</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{trends.tasksCreatedThisWeek || 0}</span>
                  <span className="text-xs font-bold text-emerald-500">↑ {Math.abs(tasksTrend)}%</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-semibold mb-1">Tasks Completed</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{trends.tasksCompletedThisWeek || 0}</span>
                  <span className="text-xs font-bold text-emerald-500">↑ {Math.abs(completedTrend)}%</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 font-semibold mb-1">Avg. Completion Time</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">2.4h</span>
                  <span className="text-xs font-bold text-rose-500">↓ 6%</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Assigned Tasks Timeline */}
      <motion.div variants={item}>
        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1f1f1f] rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Tasks Timeline</h3>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg transition-colors">
                This Week <ChevronDown size={14} />
              </button>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <button className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
              <button className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
                View Full Timeline
              </button>
            </div>
          </div>
          <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full min-w-[900px] text-sm text-left">
              <thead className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/50">
                <tr>
                  <th className="px-5 py-4 w-64 border-r border-slate-100 dark:border-slate-800/50">Task</th>
                  <th className="px-5 py-4 w-40 border-r border-slate-100 dark:border-slate-800/50">Duration</th>
                  {activityData.map((d: any, i: number) => (
                    <th key={i} className="px-2 py-4 text-center min-w-[80px]">{d.date}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {myTasks.length === 0 ? (
                  <tr>
                    <td colSpan={2 + activityData.length} className="px-5 py-8 text-center text-slate-500">No tasks in timeline.</td>
                  </tr>
                ) : myTasks.slice(0, 5).map((task: any, idx: number) => {
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-slate-500'];
                  const color = colors[idx % colors.length];
                  const bgColors = ['bg-blue-100', 'bg-emerald-100', 'bg-orange-100', 'bg-purple-100', 'bg-slate-100'];
                  const bgColor = bgColors[idx % bgColors.length];
                  
                  // Mock start and duration since we don't have task start dates easily available
                  const startCol = 1 + (idx % 3);
                  const spanCols = 2 + (idx % 3);

                  return (
                    <tr key={task.id} className="group">
                      <td className="px-5 py-4 border-r border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${color}`}></div>
                          <span className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 border-r border-slate-100 dark:border-slate-800/50">
                        <span className="text-slate-500 font-medium">May {22+idx} - May {25+idx}</span>
                      </td>
                      {activityData.map((d: any, colIdx: number) => (
                        <td key={colIdx} className="relative py-2 border-r border-slate-50 dark:border-slate-800/20 last:border-0">
                          {colIdx === startCol && (
                            <div className="absolute top-1/2 -translate-y-1/2 left-2 z-10 w-full" style={{ width: `calc(${spanCols * 100}% - 16px)` }}>
                              <div className={`h-6 rounded-full w-full ${bgColor} dark:opacity-40 flex items-center px-3 relative overflow-hidden`}>
                                <div className={`absolute left-0 top-0 bottom-0 ${color} rounded-full`} style={{ width: '60%' }}></div>
                                <span className={`relative z-10 text-[10px] font-bold ${color.replace('bg-', 'text-')} dark:text-white capitalize`}>
                                  {(task.status?.name || 'In Progress').replace('_', ' ')}
                                </span>
                              </div>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
