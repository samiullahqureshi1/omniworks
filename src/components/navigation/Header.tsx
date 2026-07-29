'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Search, Command, CheckSquare, Video, Mic, Sun, Moon, User, Shield, LogOut, Menu, Calendar, Smile, VolumeX, ChevronRight, Bell, Palette, Keyboard, Download, ExternalLink, Bug, HelpCircle, Settings, Plus, Users, FileText, Zap, Briefcase, Play, Square, Clock, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getMyAssignedTasksAction } from '@/app/actions/tasks';
import { startTimerAction, stopTimerAction, getActiveTimerAction } from '@/app/actions/tracking';
import { toast } from 'sonner';

interface HeaderProps {
  user: any;
  userOrganizations: any[];
  handleOrgSwitch: (orgId: string) => void;
  handleLogout: () => void;
  theme: any;
  setTheme: (theme: any) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  pageTitle: string;
  isSecondaryCollapsed: boolean;
  setIsSecondaryCollapsed: (collapsed: boolean) => void;
  setIsCreateChildModalOpen?: (open: boolean) => void;
}

export function Header({
  user,
  userOrganizations = [],
  handleOrgSwitch,
  handleLogout,
  theme,
  setTheme,
  setIsMobileMenuOpen,
  pageTitle,
  isSecondaryCollapsed,
  setIsSecondaryCollapsed,
  setIsCreateChildModalOpen
}: HeaderProps) {
  // Time Tracker State
  const [isTimerModalOpen, setIsTimerModalOpen] = React.useState(false);
  const [assignedTasks, setAssignedTasks] = React.useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(false);
  const [taskSearchQuery, setTaskSearchQuery] = React.useState("");
  const [activeTimer, setActiveTimer] = React.useState<{
    id: string;
    taskId?: string;
    projectId: string;
    taskTitle?: string;
    projectName?: string;
    startTime: string;
  } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [isStartingTimerId, setIsStartingTimerId] = React.useState<string | null>(null);
  const [isStoppingTimer, setIsStoppingTimer] = React.useState(false);

  // Fetch active timer on mount
  React.useEffect(() => {
    getActiveTimerAction().then(res => {
      if (res.success && res.timer) {
        setActiveTimer({
          id: res.timer.id,
          taskId: res.timer.taskId || undefined,
          projectId: res.timer.projectId,
          taskTitle: res.timer.task?.title,
          projectName: res.timer.project?.name,
          startTime: res.timer.startTime.toISOString(),
        });
      }
    });
  }, []);

  // Timer tick interval
  React.useEffect(() => {
    if (!activeTimer?.startTime) {
      setElapsedSeconds(0);
      return;
    }
    const startMs = new Date(activeTimer.startTime).getTime();
    const updateElapsed = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const formatTimerDigits = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const openTimerModal = () => {
    setIsTimerModalOpen(true);
    setIsLoadingTasks(true);
    getMyAssignedTasksAction().then(res => {
      setIsLoadingTasks(false);
      if (res.success && res.tasks) {
        setAssignedTasks(res.tasks);
      }
    });
  };

  const handleStartTimer = async (task: any) => {
    setIsStartingTimerId(task.id);
    const res = await startTimerAction(task.projectId, task.id);
    setIsStartingTimerId(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`Timer started for "${task.title}"`);
    setActiveTimer({
      id: 'timer_' + Date.now(),
      taskId: task.id,
      projectId: task.projectId,
      taskTitle: task.title,
      projectName: task.project?.name || 'Project',
      startTime: new Date().toISOString(),
    });
    setIsTimerModalOpen(false);
  };

  const handleStopTimer = async () => {
    setIsStoppingTimer(true);
    const res = await stopTimerAction();
    setIsStoppingTimer(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success("Timer stopped & time logged!");
    setActiveTimer(null);
  };

  return (
    <header className="h-[52px] bg-transparent flex items-center justify-between pl-2 pr-4 shrink-0 select-none z-30 relative shadow-none border-b border-transparent">
      {/* Left Section: Workspace Swapper & Menu Trigger */}
      <div className="flex items-center gap-2.5">
        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg border border-slate-200/50 dark:border-white/5 shadow-sm transition-colors"
        >
          <Menu size={16} />
        </button>

        {/* Gray Workspace Box */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-[#f0f0f4] dark:bg-white/5 hover:bg-[#e4e4ec] dark:hover:bg-white/10 rounded-[8px] text-[12px] font-bold text-slate-850 dark:text-slate-200 transition-colors border-0 outline-none shadow-none">
              <div className="w-5 h-5 rounded-[4px] bg-[#00a884] text-white flex items-center justify-center font-black text-[10px] shrink-0">
                {user.organizationName ? user.organizationName.substring(0, 1).toUpperCase() : 'S'}
              </div>
              <span className="truncate max-w-[125px] font-extrabold">{user.organizationName || 'Select Org'}</span>
              <ChevronDown size={11} className="text-slate-450 shrink-0 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80 bg-white dark:bg-[#151518] rounded-[8px] shadow-2xl border border-slate-200/85 dark:border-white/10 p-1.5 z-50">
            {/* Header info */}
            <div className="px-3.5 py-3 flex items-center gap-3.5 border-b border-slate-100 dark:border-white/5">
              <div className="w-10 h-10 rounded-[4px] bg-[#00a884] text-white flex items-center justify-center font-black text-lg shrink-0">
                {user.organizationName ? user.organizationName.substring(0, 1).toUpperCase() : 'S'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[13.5px] font-bold text-slate-850 dark:text-slate-200 truncate leading-none mb-1.5">
                  {user.organizationName || "Sami Ullah's Workspace"}
                </span>
                <div className="text-[11px] text-slate-400 font-semibold leading-none flex items-center gap-1.5">
                  <span>Free Forever</span>
                  <span className="text-slate-300">•</span>
                  <button className="text-violet-500 hover:text-violet-655 font-bold underline cursor-pointer outline-none">
                    Upgrade
                  </button>
                </div>
              </div>
            </div>

            {/* Organizations List for Swapping */}
            <div className="px-3 py-2 text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-wider">
              Your Workspaces
            </div>
            
            <div className="max-h-48 overflow-y-auto px-3 space-y-0.5 custom-scrollbar">
              {userOrganizations.map(org => {
                const isOwnOrg = org.role === 'OWNER';
                const labelSuffix = isOwnOrg ? ' (Full Access)' : ' (Limited Access)';
                const isCurrent = user.organizationId === org.id;

                return (
                  <DropdownMenuItem 
                    key={org.id}
                    onClick={() => handleOrgSwitch(org.id)}
                    className={`cursor-pointer rounded-[4px] px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-[#1e1e24] flex flex-col items-start outline-none transition-colors border border-transparent ${
                      isCurrent 
                        ? 'bg-[#f0f0f4] dark:bg-white/10 text-slate-800 dark:text-white font-bold border-slate-200/40 dark:border-white/5' 
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-semibold">{org.name}</span>
                    <span className="text-[9px] text-slate-400 font-medium">{isOwnOrg ? 'Own Org' : 'Shared Org'}{labelSuffix}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>

            {/* Create Workspace button */}
            <div className="px-3 py-1">
              <button 
                onClick={() => setIsCreateChildModalOpen && setIsCreateChildModalOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[6px] text-slate-750 dark:text-slate-200 font-bold text-[12.5px] transition-all outline-none"
              >
                <Plus size={15} className="text-slate-400" />
                <span>Create Workspace</span>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Small calendar icon next to workspace selector */}
        <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors hidden sm:inline-flex" title="Calendar">
          <Calendar size={14} />
        </button>

        {/* Start Time Tracking Button */}
        {activeTimer ? (
          <div className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-[8px] text-[12px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="font-mono text-[12.5px] font-black">{formatTimerDigits(elapsedSeconds)}</span>
            {activeTimer.taskTitle && (
              <span className="truncate max-w-[120px] text-[11px] opacity-90 hidden lg:inline">
                {activeTimer.taskTitle}
              </span>
            )}
            <button
              type="button"
              onClick={handleStopTimer}
              disabled={isStoppingTimer}
              className="p-1 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 rounded-md text-emerald-700 dark:text-emerald-300 transition-colors cursor-pointer ml-0.5"
              title="Stop Timer"
            >
              {isStoppingTimer ? <Loader2 size={12} className="animate-spin" /> : <Square size={10} fill="currentColor" />}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openTimerModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f0f4] dark:bg-white/5 hover:bg-[#e4e4ec] dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 rounded-[8px] text-[12px] font-bold transition-all border-0 outline-none shrink-0 cursor-pointer"
            title="Start Time Tracking"
          >
            <Play size={12} className="text-emerald-600 dark:text-emerald-400 fill-emerald-600 dark:fill-emerald-400" />
            <span>Start Time</span>
          </button>
        )}
      </div>

      {/* Center Section: unified ClickUp Search & AI Chats */}
      <div className="flex-grow max-w-sm mx-6 relative hidden md:block">
        <div className="w-full flex items-center justify-between border border-slate-200 dark:border-white/10 rounded-full pl-3 pr-1 py-0.5 bg-white/70 dark:bg-[#1e1e24]/40 backdrop-blur-sm shadow-sm h-8.5 select-none">
          <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs">
            <Search size={13} className="shrink-0" />
            <span className="text-[11px] font-medium">Search</span>
            <span className="text-[9px] font-semibold opacity-75">⌘K</span>
          </div>
          
          {/* Embedded AI Chats button */}
          <button 
            className="flex items-center gap-1.5 bg-[#f0f0f4] dark:bg-white/10 border border-slate-200/50 dark:border-white/5 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:bg-[#e4e4ec] dark:hover:bg-white/15 transition-colors cursor-pointer mr-0.5"
          >
            <span>AI Chats</span>
            {/* ClickUp colored flower dot icon */}
            <span className="relative flex items-center justify-center w-2.5 h-2.5">
              <span className="absolute w-1 h-1 rounded-full bg-[#f43f5e] -translate-y-0.75" />
              <span className="absolute w-1 h-1 rounded-full bg-[#3b82f6] -translate-x-0.75" />
              <span className="absolute w-1 h-1 rounded-full bg-[#10b981] translate-x-0.75" />
              <span className="absolute w-1 h-1 rounded-full bg-[#fbbf24] translate-y-0.75" />
            </span>
          </button>
        </div>
      </div>

      {/* Right Section: Quick Tools & Avatar */}
      <div className="flex items-center gap-4">
        {/* Quick Tools Icons */}
        <div className="hidden sm:flex items-center gap-2.5 text-slate-400">
          <button className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <CheckSquare size={16} />
          </button>
          <button className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <Video size={16} />
          </button>
          <button className="hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <Mic size={16} />
          </button>
        </div>

        {/* Theme toggler */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-full flex items-center justify-center"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* User avatar profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 hover:opacity-85 transition-opacity outline-none bg-transparent">
              <div className="relative">
                <Avatar className="h-7 w-7 border-0 shrink-0 bg-[#000000] text-white">
                  <AvatarFallback className="bg-[#000000] text-white text-[10px] font-black uppercase flex items-center justify-center">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : 'SU'}
                  </AvatarFallback>
                </Avatar>
                {/* Active indicator dot */}
                <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-[#10b981] ring-1.5 ring-white dark:ring-[#151518]" />
              </div>
              <ChevronDown size={11} className="text-slate-450 shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-white dark:bg-[#151518] rounded-xl shadow-2xl border border-slate-200/85 dark:border-white/10 p-1.5 mt-2 z-50">
            {/* User Profile Header */}
            <div className="px-3.5 py-3 flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-10 w-10 border-0 shrink-0 bg-[#000000] text-white">
                  <AvatarFallback className="bg-[#000000] text-white text-[14px] font-black uppercase flex items-center justify-center">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : 'SU'}
                  </AvatarFallback>
                </Avatar>
                {/* Active indicator dot */}
                <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-[#10b981] ring-2 ring-white dark:ring-[#151518]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate leading-none mb-1">
                  {user.name || 'Sami Ullah'}
                </span>
                <span className="text-[11px] text-slate-400 font-semibold leading-none">
                  Online
                </span>
              </div>
            </div>

            {/* Set Status Input Box */}
            <div className="px-2.5 mb-2">
              <button className="w-full flex items-center gap-2 px-3 py-1.5 border border-slate-250/70 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-slate-450 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-all text-left outline-none">
                <Smile size={15} className="text-slate-400" />
                <span className="text-[12.5px]">Set status</span>
              </button>
            </div>

            {/* Mute Notifications Button */}
            <div className="px-1 mb-1">
              <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left outline-none">
                <div className="flex items-center gap-2.5">
                  <VolumeX size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Mute notifications</span>
                </div>
                <ChevronRight size={13} className="text-slate-400" />
              </button>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-1.5" />

            {/* Option List items */}
            <div className="px-1 space-y-0.5">
              <Link href="/workspace/settings">
                <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                  <Settings size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
              
              <Link href="/workspace/notifications">
                <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                  <Bell size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Notifications</span>
                </DropdownMenuItem>
              </Link>

              <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <Palette size={15} className="text-slate-450 dark:text-slate-400" />
                <span>Themes</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <Keyboard size={15} className="text-slate-450 dark:text-slate-400" />
                <span>Keyboard shortcuts</span>
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <div className="flex items-center gap-2.5">
                  <Download size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Download ClickUp</span>
                </div>
                <ExternalLink size={13} className="text-slate-450 dark:text-slate-400" />
              </DropdownMenuItem>

              <DropdownMenuItem className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors outline-none">
                <div className="flex items-center gap-2.5">
                  <HelpCircle size={15} className="text-slate-450 dark:text-slate-400" />
                  <span>Help</span>
                </div>
                <Bug size={13} className="text-slate-450 dark:text-slate-400" />
              </DropdownMenuItem>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-1.5" />

            <div className="px-1">
              <DropdownMenuItem 
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors outline-none"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Start Time Tracking Dialog */}
      <Dialog open={isTimerModalOpen} onOpenChange={setIsTimerModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 flex flex-col rounded-[8px] sm:rounded-[8px] overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] shadow-[0_24px_70px_rgba(0,0,0,0.28)] [&>button]:right-5 [&>button]:top-5 [&>button]:text-slate-400 [&>button]:opacity-100 [&>button_svg]:size-5">
          <div className="px-6 py-[18px] border-b border-slate-200/80 dark:border-white/10">
            <DialogTitle className="pr-10 text-[17px] font-bold text-slate-900 dark:text-white leading-tight tracking-[-0.01em] flex items-center gap-2">
              <Clock size={16} className="text-emerald-600 dark:text-emerald-400" /> Start Time Tracking
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-5 text-slate-500 dark:text-slate-400 mt-1">
              Select an assigned task below to start tracking your time.
            </DialogDescription>
          </div>

          {/* Search Input */}
          <div className="p-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search your assigned tasks..."
                value={taskSearchQuery}
                onChange={e => setTaskSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] outline-none focus:border-slate-400 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Task List */}
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-slate-100 dark:divide-white/5 p-2">
            {isLoadingTasks ? (
              <div className="py-10 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-emerald-600" /> Loading your assigned tasks...
              </div>
            ) : (() => {
              const filtered = assignedTasks.filter(t =>
                t.title.toLowerCase().includes(taskSearchQuery.toLowerCase()) ||
                (t.project?.name || '').toLowerCase().includes(taskSearchQuery.toLowerCase())
              );

              if (filtered.length === 0) {
                return (
                  <div className="py-10 text-center text-xs font-medium text-slate-400">
                    No assigned tasks found.
                  </div>
                );
              }

              return filtered.map(t => (
                <div key={t.id} className="p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-[8px] flex items-center justify-between gap-3 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {t.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-semibold truncate mt-0.5 flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">{t.project?.name || 'No Project'}</span>
                      {t.status && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold" style={{ color: t.status.color, backgroundColor: `${t.status.color}15` }}>
                          {t.status.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isStartingTimerId === t.id}
                    onClick={() => handleStartTimer(t)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isStartingTimerId === t.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Play size={11} fill="currentColor" />
                    )}
                    <span>Start</span>
                  </button>
                </div>
              ));
            })()}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex justify-end">
            <button
              type="button"
              onClick={() => setIsTimerModalOpen(false)}
              className="h-8 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[8px] transition-colors outline-none cursor-pointer"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
