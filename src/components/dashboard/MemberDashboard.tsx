'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, ClipboardList, Clock, Zap, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import DashboardTaskModal from './DashboardTaskModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function MemberDashboard({ metrics }: { metrics: any }) {
  const router = useRouter();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<'all' | 'today' | 'pending' | 'completed'>('all');
  const [timelineMode, setTimelineMode] = useState<'week' | 'month'>('week');
  const [weekOffset, setWeekOffset] = useState<number>(0);

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

  const completedTasksCount = myTasks.filter((t: any) => t.status?.name?.toLowerCase().includes('done') || t.status?.name?.toLowerCase().includes('complete')).length;
  const totalTasksCount = myTasks.length;
  const remainingTasksCount = totalTasksCount - completedTasksCount;
  const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
  const productivityScore = trends.productivityScore || (totalTasksCount > 0 ? completionRate : 100);

  // Trend Calculations
  const calcTrend = (current: number, past: number) => {
    if (past === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - past) / past) * 100);
  };

  const tasksTrend = calcTrend(trends.tasksCreatedThisWeek || 0, trends.tasksCreatedLastWeek || 0);
  const hoursTrend = calcTrend(totalHours, metrics?.hoursLastWeek || 0);
  const prodTrend = calcTrend(productivityScore, trends.productivityScoreLastWeek || 0);

  const formatTrend = (val: number) => {
    const isPos = val >= 0;
    return {
      text: `${isPos ? '↑' : '↓'} ${Math.abs(val)}% vs last week`,
      colorClass: isPos ? 'text-emerald-500' : 'text-rose-500'
    };
  };

  const tTasksTrend = formatTrend(tasksTrend);
  const hLoggedTrend = formatTrend(hoursTrend);
  const pScoreTrend = formatTrend(prodTrend);

  const formatTime = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h ${mins}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400';
      case 'medium': return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
      case 'low': return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s.includes('progress') || s.includes('working')) return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    if (s.includes('schedule') || s.includes('todo') || s.includes('plan')) return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
    if (s.includes('pending') || s.includes('hold')) return 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400';
    if (s.includes('done') || s.includes('complete')) return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  };

  // Dynamic progress calculation without mock data
  const getProgressVal = (task: any) => {
    const statusName = (task.status?.name || '').toLowerCase();
    if (statusName.includes('done') || statusName.includes('complete')) return 100;
    if (statusName.includes('todo') || statusName.includes('backlog') || statusName.includes('schedule')) return 0;
    
    const allocated = parseFloat(task.allocatedHours) || 0;
    const tracked = parseFloat(task.trackedHours) || 0;
    if (allocated > 0 && tracked >= 0) {
      const calc = Math.round((tracked / allocated) * 100);
      return Math.min(Math.max(calc, 10), 95);
    }
    
    if (statusName.includes('review') || statusName.includes('testing')) return 80;
    if (statusName.includes('progress') || statusName.includes('working')) return 50;
    if (statusName.includes('pending') || statusName.includes('hold')) return 25;
    return 40;
  };

  // Filtering Today's Tasks
  const filteredTasks = myTasks.filter((t: any) => {
    const statusName = (t.status?.name || '').toLowerCase();
    const isDone = statusName.includes('done') || statusName.includes('complete');
    
    if (taskFilter === 'pending') return !isDone;
    if (taskFilter === 'completed') return isDone;
    if (taskFilter === 'today') {
      if (!t.dueDate) return true;
      const dueStr = new Date(t.dueDate).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      return dueStr === todayStr;
    }
    return true;
  });

  // Dynamic Timeline Columns based on mode and week offset
  const getTimelineColumns = () => {
    const today = new Date();
    if (timelineMode === 'month') {
      const base = new Date(today.getFullYear(), today.getMonth() + weekOffset, 1);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base.getFullYear(), base.getMonth(), 1 + i * 4);
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
          fullDate: d,
        };
      });
    }

    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase(),
        fullDate: d,
      };
    });
  };

  const timelineCols = getTimelineColumns();

  // Dynamic placement of task bar on timeline
  const calcTaskTimelineSpan = (task: any, colList: any[], idx: number) => {
    const taskStart = new Date(task.createdAt || Date.now());
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(taskStart.getTime() + 86400000 * 2);

    let startCol = -1;
    let endCol = -1;

    colList.forEach((col, cIdx) => {
      const cTime = new Date(col.fullDate).setHours(0, 0, 0, 0);
      const sTime = new Date(taskStart).setHours(0, 0, 0, 0);
      const eTime = new Date(taskEnd).setHours(0, 0, 0, 0);

      if (sTime <= cTime && eTime >= cTime) {
        if (startCol === -1) startCol = cIdx;
        endCol = cIdx;
      }
    });

    if (startCol === -1) {
      startCol = idx % 4;
      endCol = Math.min(startCol + 2, colList.length - 1);
    }

    const spanCols = Math.max(1, endCol - startCol + 1);
    return { startCol, spanCols };
  };

  const filterLabels: Record<string, string> = {
    all: 'View all tasks',
    today: 'Due Today',
    pending: 'Pending Tasks',
    completed: 'Completed Tasks',
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6 mt-2 w-full max-w-[1400px] mx-auto text-slate-900 dark:text-white">
      
      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Projects */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-[8px] bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[8px] bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <FolderKanban className="text-blue-500 w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Total Projects</span>
                <span className="text-3xl font-bold mb-2">{totalProjects}</span>
                <span className="text-xs font-semibold text-blue-500">Active assigned</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Total Tasks */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-[8px] bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[8px] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                <ClipboardList className="text-emerald-500 w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Total Tasks</span>
                <span className="text-3xl font-bold mb-2">{totalTasksCount}</span>
                <span className={`text-xs font-semibold ${tTasksTrend.colorClass}`}>{tTasksTrend.text}</span>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalTasksCount === 0 ? 0 : (completedTasksCount/totalTasksCount)*100}%` }}></div>
              </div>
              <span className="text-xs text-slate-500 text-right font-medium">{remainingTasksCount} remaining</span>
            </div>
          </Card>
        </motion.div>

        {/* Hours Logged */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-[8px] bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-[8px] bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                  <Clock className="text-purple-500 w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Hours Logged</span>
                  <span className="text-3xl font-bold mb-2 whitespace-nowrap">{formatTime(totalHours)}</span>
                  <span className={`text-xs font-semibold ${hLoggedTrend.colorClass}`}>{hLoggedTrend.text}</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Productivity Score */}
        <motion.div variants={item}>
          <Card className="h-full border border-slate-100 dark:border-slate-800 shadow-sm rounded-[8px] bg-white dark:bg-[#1f1f1f] p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-[8px] bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                  <Zap className="text-orange-500 w-6 h-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white mb-1">Productivity Score</span>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-bold">{productivityScore}</span>
                    <span className="text-sm text-slate-400 font-medium">/100</span>
                  </div>
                  <span className={`text-xs font-semibold ${pScoreTrend.colorClass}`}>{pScoreTrend.text}</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Middle Row: Today's Tasks (Full Width) */}
      <div className="w-full">
        <motion.div variants={item} className="flex flex-col w-full">
          <Card className="w-full border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[8px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Today's Tasks</CardTitle>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">{filteredTasks.length}</span>
              </div>

              {/* Workable Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-[8px] transition-colors cursor-pointer outline-none">
                    {filterLabels[taskFilter]} <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-[8px] shadow-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1f1f1f]">
                  <DropdownMenuItem onClick={() => setTaskFilter('all')} className="cursor-pointer rounded-[6px]">
                    View all tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskFilter('today')} className="cursor-pointer rounded-[6px]">
                    Due Today
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskFilter('pending')} className="cursor-pointer rounded-[6px]">
                    Pending Tasks
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTaskFilter('completed')} className="cursor-pointer rounded-[6px]">
                    Completed Tasks
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto flex-1">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-[10px] uppercase text-slate-400 font-bold bg-slate-50 dark:bg-[#181818]/50">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Task</th>
                    <th className="px-5 py-3 font-semibold text-center">Priority</th>
                    <th className="px-5 py-3 font-semibold text-center">Status</th>
                    <th className="px-5 py-3 font-semibold text-center">Due Date</th>
                    <th className="px-5 py-3 font-semibold w-32">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">No tasks found for this filter.</td>
                    </tr>
                  ) : filteredTasks.slice(0, 5).map((task: any) => {
                    const progress = getProgressVal(task);
                    const isDone = progress === 100;
                    return (
                      <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}>
                        <td className="px-5 py-3.5 flex items-center gap-3">
                          <button className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${isDone ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'}`}>
                            {isDone && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                          </button>
                          <div className="flex flex-col min-w-[200px]">
                            <span className={`font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{task.title}</span>
                            <span className="text-[11px] text-slate-400 truncate">{task.project?.name || 'No Project'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                              {task.priority || 'MEDIUM'}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-center">
                            <span className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold capitalize ${getStatusColor(task.status?.name)}`}>
                              {(task.status?.name || 'To Do').replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center text-slate-600 dark:text-slate-300 font-medium">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Due Date'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-8">{progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Assigned Tasks Timeline */}
      <motion.div variants={item}>
        <Card className="border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[8px] overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Tasks Timeline</h3>
            <div className="flex items-center gap-3">
              
              {/* Workable Timeline Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-[8px] transition-colors outline-none cursor-pointer">
                    {timelineMode === 'week' ? 'This Week' : 'This Month'} <ChevronDown size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 rounded-[8px] shadow-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1f1f1f]">
                  <DropdownMenuItem onClick={() => { setTimelineMode('week'); setWeekOffset(0); }} className="cursor-pointer rounded-[6px]">
                    This Week
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setTimelineMode('month'); setWeekOffset(0); }} className="cursor-pointer rounded-[6px]">
                    This Month
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Dynamic Navigation Arrows (< and >) */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  title="Previous Range"
                  className="w-8 h-8 rounded-[8px] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  title="Next Range"
                  className="w-8 h-8 rounded-[8px] border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Reset to current timeline */}
              {weekOffset !== 0 && (
                <button 
                  onClick={() => setWeekOffset(0)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white underline cursor-pointer"
                >
                  Current
                </button>
              )}

              <button 
                onClick={() => router.push('/workspace/planner/schedule')}
                className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-4 py-1.5 rounded-[8px] hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
              >
                View Full Timeline
              </button>
            </div>
          </div>
          <div className="w-full overflow-x-auto custom-scrollbar pb-2">
            <table className="w-full min-w-[900px] text-sm text-left">
              <thead className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800/50">
                <tr>
                  <th className="px-5 py-4 w-64 border-r border-slate-100 dark:border-slate-800/50">Task</th>
                  <th className="px-5 py-4 w-44 border-r border-slate-100 dark:border-slate-800/50">Duration</th>
                  {timelineCols.map((col: any, i: number) => (
                    <th key={i} className="px-2 py-4 text-center min-w-[80px]">{col.date}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {myTasks.length === 0 ? (
                  <tr>
                    <td colSpan={2 + timelineCols.length} className="px-5 py-8 text-center text-slate-500">No tasks in timeline.</td>
                  </tr>
                ) : myTasks.slice(0, 5).map((task: any, idx: number) => {
                  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-orange-500', 'bg-purple-500', 'bg-slate-500'];
                  const color = colors[idx % colors.length];
                  const bgColors = ['bg-blue-100', 'bg-emerald-100', 'bg-orange-100', 'bg-purple-100', 'bg-slate-100'];
                  const bgColor = bgColors[idx % bgColors.length];

                  const { startCol, spanCols } = calcTaskTimelineSpan(task, timelineCols, idx);

                  const startDate = new Date(task.createdAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const endDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No Due Date';
                  const progress = getProgressVal(task);

                  return (
                    <tr key={task.id} className="group">
                      <td className="px-5 py-4 border-r border-slate-100 dark:border-slate-800/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${color}`}></div>
                          <span 
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer underline-offset-2 hover:underline transition-colors truncate max-w-[200px]"
                            onClick={() => { setSelectedTask(task); setIsModalOpen(true); }}
                          >
                            {task.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 border-r border-slate-100 dark:border-slate-800/50">
                        <span className="text-slate-500 font-medium">{startDate} - {endDate}</span>
                      </td>
                      {timelineCols.map((col: any, colIdx: number) => (
                        <td key={colIdx} className="relative py-2 border-r border-slate-50 dark:border-slate-800/20 last:border-0">
                          {colIdx === startCol && (
                            <div className="absolute top-1/2 -translate-y-1/2 left-2 z-10 w-full" style={{ width: `calc(${spanCols * 100}% - 16px)` }}>
                              <div className={`h-6 rounded-[8px] w-full ${bgColor} dark:opacity-40 flex items-center px-3 relative overflow-hidden`}>
                                <div className={`absolute left-0 top-0 bottom-0 ${color} rounded-[8px] transition-all duration-300`} style={{ width: `${progress}%` }}></div>
                                <span className={`relative z-10 text-[10px] font-bold ${color.replace('bg-', 'text-')} dark:text-white capitalize`}>
                                  {(task.status?.name || 'In Progress').replace('_', ' ')} ({progress}%)
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

      <DashboardTaskModal
        task={selectedTask}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </motion.div>
  );
}
