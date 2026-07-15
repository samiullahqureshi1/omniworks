'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Clock, Users, Activity, ListTodo, Search, ArrowUpDown, Filter, Plus, Download, ChevronDown, CheckCircle2, AlertCircle, Clock3, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatHours } from '@/lib/utils';

export default function OwnerDashboard({ metrics }: { metrics: any }) {
  const [taskSummaryMonth, setTaskSummaryMonth] = useState('2025-04');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const [filterStatus, setFilterStatus] = useState('');
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
  const projectStatusCounts = metrics?.projectStatusCounts || { COMPLETE: 0, IN_PROGRESS: 0, PLANNING: 0, ON_HOLD: 0 };
  const incompleteProjects = projectStatusCounts.IN_PROGRESS + projectStatusCounts.PLANNING;
  const pendingPastDueCount = metrics?.pendingPastDueCount || 0;
  const recentTasks = metrics?.recentTasks || [];
  const totalCompleteTasks = metrics?.totalCompleteTasks || 0;
  const totalPendingTasks = metrics?.totalPendingTasks || 0;
  
  // Dynamic data matching the visual image structure
  const stats = [
    { title: "Completed Project", value: projectStatusCounts.COMPLETE, label: "Total count" },
    { title: "Incomplete Project", value: incompleteProjects, label: "Total count" },
    { title: "Pending Past Due", value: pendingPastDueCount, label: "Task count" },
    { title: "Total Project", value: totalProjects, label: "Total count" }
  ];

  const reminders = [
    { id: 1, title: "Task Review & Updates", desc: "Review completed tasks and update project board.", icon: CheckCircle2, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-white/10", active: false },
    { id: 2, title: "Client Feedback Follow-Up", desc: "Review completed tasks and update project board.", icon: Activity, color: "text-white", bg: "bg-slate-900 dark:bg-white", active: true },
    { id: 3, title: "Sprint Planning Session", desc: "Collect client feedback for ongoing tasks.", icon: Clock3, color: "text-slate-600 dark:text-slate-300", bg: "bg-slate-100 dark:bg-white/10", active: false }
  ];

  const tasks = recentTasks.map((t: any, index: number) => {
    let sColor = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400";
    const sName = t.status?.name?.toLowerCase() || "";
    if (sName.includes("done") || sName.includes("complete")) sColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    else if (sName.includes("progress")) sColor = "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    else if (sName.includes("hold") || sName.includes("review")) sColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    else if (sName.includes("todo") || sName.includes("backlog")) sColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";

    return {
      id: t.id.substring(0, 5),
      name: t.title || "Untitled",
      project: t.project?.name || "No Project",
      deadline: t.dueDate ? new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "None",
      priority: t.priority || "MEDIUM",
      assignee: t.assignees?.[0]?.user?.name || "Unassigned",
      status: t.status?.name || "To Do",
      date: new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      sColor
    };
  });

  let processedTasks = [...tasks];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    processedTasks = processedTasks.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.project.toLowerCase().includes(q) || 
      t.assignee.toLowerCase().includes(q)
    );
  }

  if (filterStatus) {
    processedTasks = processedTasks.filter(t => t.status === filterStatus);
  }

  if (sortConfig.key) {
    processedTasks.sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Dynamic percentages for radial chart
  const projectDonePercent = totalProjects > 0 ? Math.round((projectStatusCounts.COMPLETE / totalProjects) * 100) : 0;
  const inProgressPercent = totalProjects > 0 ? Math.round((projectStatusCounts.IN_PROGRESS / totalProjects) * 100) : 0;
  const backlogPercent = totalProjects > 0 ? Math.round(((projectStatusCounts.PLANNING + projectStatusCounts.ON_HOLD) / totalProjects) * 100) : 0;
  
  const c42 = 2 * Math.PI * 42; // 263.89
  const c28 = 2 * Math.PI * 28; // 175.92
  const c14 = 2 * Math.PI * 14; // 87.96

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6 mt-2 w-full">
      
      {/* Top Row: Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div key={idx} variants={item}>
            <Card className="h-full border-none shadow-sm flex flex-col bg-white dark:bg-[#1f1f1f] rounded-[28px] p-2">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{stat.title}</span>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <span className="text-[32px] font-bold text-slate-900 dark:text-white leading-none block mb-1">{stat.value}</span>
                    <span className="text-sm text-slate-500 font-medium">{stat.label}</span>
                  </div>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-white/15 transition-colors">
                    <Filter size={14} /> 1 Filter
                  </button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Middle Row: Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Project Completed Radial Chart */}
        <motion.div variants={item}>
          <Card className="h-[360px] border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Project Completed
              </CardTitle>
              <span className="text-sm font-semibold text-slate-500">Total Project {totalProjects}</span>
            </CardHeader>
            <CardContent className="flex items-center justify-between px-6 pt-4">
              <div className="flex flex-col gap-6 w-[120px]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-slate-900 dark:bg-white"></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Project Done</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{projectDonePercent}%</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-slate-500 dark:bg-slate-400"></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">In Progress</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{inProgressPercent}%</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Backlog</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{backlogPercent}%</span>
                </div>
              </div>

              {/* Pure CSS Radial Chart using SVG */}
              <div className="relative w-[180px] h-[180px] flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  {/* Background circles */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                  <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                  <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />

                  {/* Outer Ring (Project Done) */}
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={c42} strokeDashoffset={c42 - (projectDonePercent / 100) * c42} className="text-slate-900 dark:text-white" />

                  {/* Middle Ring (In Progress) */}
                  <circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={c28} strokeDashoffset={c28 - (inProgressPercent / 100) * c28} className="text-slate-500 dark:text-slate-400" />

                  {/* Inner Ring (Backlog) */}
                  <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={c14} strokeDashoffset={c14 - (backlogPercent / 100) * c14} className="text-slate-300 dark:text-slate-600" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Task Summary Area Chart */}
        <motion.div variants={item}>
          <Card className="h-[360px] border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                <div className="p-1.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 rounded-lg"><ListTodo size={18}/></div>
                Task Summary
              </CardTitle>
              <div className="relative">
                <button className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1f1f1f] text-xs font-semibold flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Clock3 size={12}/> 
                  {taskSummaryMonth ? new Date(taskSummaryMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Select Month'}
                  <ChevronDown size={14} />
                </button>
                <input 
                  type="month" 
                  value={taskSummaryMonth}
                  onChange={(e) => setTaskSummaryMonth(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex items-center gap-6 mb-6 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-800 dark:bg-slate-300"></div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Complete Tasks</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-600"></div>
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pending Tasks</span>
                </div>
              </div>
              
              <div className="relative h-[180px] w-full px-4">
                {/* CSS Step Chart visualization mimicking area chart */}
                <div className="absolute inset-y-0 left-8 right-8">
                  {(() => {
                    const maxCount = Math.max(totalCompleteTasks, totalPendingTasks, 5);
                    const stepSize = Math.ceil(maxCount / 5);
                    const yAxisSteps = Array.from({ length: 6 }, (_, i) => (5 - i) * stepSize);
                    return yAxisSteps.map((val) => (
                      <div key={val} className="absolute w-full border-t border-dashed border-slate-200 dark:border-slate-800" style={{ bottom: `${(val / yAxisSteps[0]) * 100}%` }}>
                        <span className="absolute -left-9 -top-2 text-[10px] text-slate-400 bg-white dark:bg-[#1f1f1f] pr-1.5">{val}</span>
                      </div>
                    ));
                  })()}
                </div>
                
                {/* Simulated Area Paths */}
                <div className="absolute inset-x-8 inset-y-0 flex items-end">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#475569" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#475569" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    {/* Pending Path */}
                    <path d="M0,40 L15,40 L15,60 L35,60 L35,30 L55,30 L55,50 L75,50 L75,40 L100,40 L100,100 L0,100 Z" fill="#e2e8f0" opacity="0.5" className="dark:fill-slate-700"/>
 
                    {/* Complete Path */}
                    <path d="M0,60 L15,60 L15,80 L35,80 L35,45 L55,45 L55,70 L75,70 L75,60 L100,60 L100,100 L0,100 Z" fill="url(#areaGradient)" stroke="#475569" strokeWidth="2" vectorEffect="non-scaling-stroke" className="dark:stroke-slate-300"/>
                  </svg>
 
                  {/* Tooltip Overlay */}
                  <div className="absolute left-[55%] top-[30%] w-px h-[70%] bg-slate-300 dark:bg-slate-600 flex flex-col items-center">
                    <div className="absolute -top-1 w-2 h-2 rounded-full border-2 border-white dark:border-[#1f1f1f] bg-slate-800 dark:bg-slate-300"></div>
                    <div className="absolute -top-6 w-2 h-2 rounded-full border-2 border-white dark:border-[#1f1f1f] bg-slate-400"></div>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-2.5 min-w-[110px] border border-slate-100 dark:border-slate-700 z-10 flex flex-col gap-1.5">
                       <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                         <span>Pending: {totalPendingTasks.toLocaleString()}</span>
                       </div>
                       <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                         <div className="w-1.5 h-1.5 rounded-full bg-slate-800 dark:bg-slate-350"></div>
                         <span>Complete: {totalCompleteTasks.toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                </div>
 
                <div className="absolute -bottom-6 inset-x-8 flex justify-between text-[10px] text-slate-400 font-bold">
                  <span>&lt;</span>
                  <span>18th</span><span>19th</span><span>20th</span><span>21st</span><span>22nd</span><span>23rd</span><span>24th</span><span>25th</span>
                  <span>&gt;</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Row: Reminders and Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Reminders List */}
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="h-full border-none shadow-sm bg-[#f8f9fc] dark:bg-[#181818] rounded-[32px] p-2">
            <CardHeader className="flex flex-row items-center justify-between pb-4 px-6 pt-6">
              <CardTitle className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                Reminders <AlertCircle size={16} className="text-slate-400"/>
              </CardTitle>
              <div className="flex items-center gap-2">
                <button className="h-8 w-8 rounded-full bg-white dark:bg-[#2a2a2a] flex items-center justify-center text-slate-600 shadow-sm"><Activity size={14}/></button>
                <button className="h-8 w-8 rounded-full bg-white dark:bg-[#2a2a2a] flex items-center justify-center text-slate-600 shadow-sm"><MoreVertical size={14}/></button>
              </div>
            </CardHeader>
            <CardContent className="px-4">
              <div className="flex flex-col gap-3">
                {reminders.map((r) => {
                  const Icon = r.icon;
                  return (
                    <div key={r.id} className={`flex items-center gap-4 p-4 rounded-[20px] transition-all cursor-pointer ${r.active ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' : 'bg-white dark:bg-[#2a2a2a] hover:bg-slate-50 dark:hover:bg-[#333]'}`}>
                      <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center ${r.active ? 'bg-white/20 dark:bg-slate-900/10' : 'bg-slate-50 dark:bg-[#1f1f1f] border border-slate-100 dark:border-[#333]'}`}>
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${r.active ? 'bg-white dark:bg-slate-900' : r.bg}`}>
                           <Icon size={16} className={r.active ? 'text-slate-900 dark:text-white' : r.color} />
                        </div>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className={`text-base font-bold truncate ${r.active ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'}`}>{r.title}</span>
                        <span className={`text-xs truncate ${r.active ? 'text-white/80 dark:text-slate-900/70' : 'text-slate-500 dark:text-slate-400'}`}>{r.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Task List Table */}
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full border-none shadow-sm bg-white dark:bg-[#1f1f1f] rounded-[32px] p-2">
            <CardHeader className="flex flex-col xl:flex-row xl:items-center justify-between pb-4 gap-4 px-6 pt-6 border-b border-slate-100 dark:border-slate-800/60">
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Recent Tasks
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search here..." 
                    value={searchQuery || ''}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-[#f8f9fc] dark:bg-[#181818] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500"
                  />
                </div>
                <div className="relative">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1f1f1f] text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <ArrowUpDown size={14} /> {sortConfig.key ? `Sort: ${sortConfig.key}` : 'Sort'} <ChevronDown size={14} />
                  </button>
                  <select 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={sortConfig.key || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) setSortConfig({ key: '', direction: '' });
                      else setSortConfig({ key: val, direction: 'asc' }); // Simple A-Z for now
                    }}
                  >
                    <option value="">None</option>
                    <option value="name">Name</option>
                    <option value="project">Project</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>
                <div className="relative">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1f1f1f] text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Filter size={14} /> {filterStatus || 'Filter'} <ChevronDown size={14} />
                  </button>
                  <select 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    value={filterStatus || ''}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All</option>
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="In Review">In Review</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto px-4">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-y border-slate-200 dark:border-slate-800 text-slate-500 font-semibold bg-[#f8f9fc] dark:bg-[#181818]">
                    <th className="px-4 py-3 rounded-l-xl">#</th>
                    <th className="px-4 py-3">Task Name</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Deadline</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Task Status</th>
                    <th className="px-4 py-3 rounded-r-xl">Start Date</th>
                  </tr>
                </thead>
                <tbody>
                  {processedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">No tasks found.</td>
                    </tr>
                  ) : processedTasks.map((task: any, i: number) => (
                    <tr key={task.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-4 py-4 font-semibold text-slate-500">{task.id}</td>
                      <td className="px-4 py-4 font-bold text-slate-900 dark:text-white">{task.name}</td>
                      <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-400">{task.project}</td>
                      <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-400">{task.deadline}</td>
                      <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-300">{task.priority}</td>
                      <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-400">{task.assignee}</td>
                      <td className="px-4 py-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${task.sColor}`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-600 dark:text-slate-400">{task.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
    </motion.div>
  );
}
