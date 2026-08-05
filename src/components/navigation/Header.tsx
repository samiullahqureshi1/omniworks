'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Search, Command, CheckSquare, Video, Mic, Sun, Moon, User, Shield, LogOut, Menu, Calendar, Smile, VolumeX, ChevronRight, Bell, Palette, Keyboard, Download, ExternalLink, Bug, HelpCircle, Settings, Plus, Users, FileText, Zap, Briefcase, Play, Square, Clock, Loader2, MoonStar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getMyAssignedTasksAction } from '@/app/actions/tasks';
import { startTimerAction, stopTimerAction, getActiveTimerAction, reportActivityAction, uploadScreenshotAction, clearTrackedTimeAction } from '@/app/actions/tracking';
import { requestAdditionalHoursAction } from '@/app/actions/hoursRequests';
import { getMyNotificationsAction, markNotificationReadAction } from '@/app/actions/notifications';
import { useRealtime } from '@/hooks/useRealtime';
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
    allocatedHours?: number;
  } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [isStartingTimerId, setIsStartingTimerId] = React.useState<string | null>(null);
  const [isStoppingTimer, setIsStoppingTimer] = React.useState(false);
  const [isTimerSleeping, setIsTimerSleeping] = React.useState(false);
  const lastActivityRef = React.useRef<number>(Date.now());

  // Additional Hours Request Modal State
  const [isHoursRequestModalOpen, setIsHoursRequestModalOpen] = React.useState(false);
  const [hoursRequestTask, setHoursRequestTask] = React.useState<{ id: string; title: string } | null>(null);
  const [requestedHours, setRequestedHours] = React.useState('1');
  const [requestReason, setRequestReason] = React.useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = React.useState(false);

  // Notification Bell State
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = React.useState(false);
  // Shares the workspace layout's existing SSE stream (see useRealtime).
  const { lastEvent } = useRealtime([]);

  // Activity listeners to track real-time user interaction
  React.useEffect(() => {
    const markActivity = () => {
      lastActivityRef.current = Date.now();
      // If sleeping, wake up immediately on any activity
      setIsTimerSleeping(prev => {
        if (prev) return false;
        return prev;
      });
    };

    window.addEventListener('mousemove', markActivity, { passive: true });
    window.addEventListener('keydown', markActivity, { passive: true });
    window.addEventListener('mousedown', markActivity, { passive: true });
    window.addEventListener('scroll', markActivity, { passive: true });
    window.addEventListener('touchstart', markActivity, { passive: true });

    return () => {
      window.removeEventListener('mousemove', markActivity);
      window.removeEventListener('keydown', markActivity);
      window.removeEventListener('mousedown', markActivity);
      window.removeEventListener('scroll', markActivity);
      window.removeEventListener('touchstart', markActivity);
    };
  }, []);

  // Request browser notification permission on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Helper: Fire OS-level browser notification
  const fireOSNotification = React.useCallback((title: string, body: string, icon = '/favicon.ico') => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body, icon, badge: icon });
        setTimeout(() => n.close(), 8000);
      } catch (e) {
        console.error('OS notification failed:', e);
      }
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = React.useCallback(async () => {
    const res = await getMyNotificationsAction();
    if (res.success && res.notifications) {
      setNotifications(res.notifications);
      setUnreadCount(res.notifications.filter((n: any) => !n.isRead).length);
    }
  }, []);

  // Notifications are pushed, not polled. This shares the SSE stream the workspace
  // layout already holds open, so it costs no extra connection. The previous 30s
  // poll cost one session lookup + one query per user per 30s.
  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  React.useEffect(() => {
    if (lastEvent) fetchNotifications();
  }, [lastEvent, fetchNotifications]);

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
          startTime: new Date(res.timer.startTime).toISOString(),
          allocatedHours: res.timer.task?.allocatedHours || undefined,
        });
        setIsTimerSleeping(res.timer.isIdle || false);
      }
    });
  }, []);

  // Timer tick interval — counts active seconds only (excludes sleeping time)
  React.useEffect(() => {
    if (!activeTimer?.startTime) {
      setElapsedSeconds(0);
      return;
    }
    // When sleeping, freeze the elapsed count
    if (isTimerSleeping) return;

    const startMs = new Date(activeTimer.startTime).getTime();
    const updateElapsed = () => {
      const diffSec = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(diffSec);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeTimer, isTimerSleeping]);

  // 1-Hour Total Auto-Stop check
  React.useEffect(() => {
    if (!activeTimer?.startTime) return;
    const startMs = new Date(activeTimer.startTime).getTime();
    const check = setInterval(() => {
      const totalElapsedSecs = Math.floor((Date.now() - startMs) / 1000);
      if (totalElapsedSecs >= 3600) { // 1 hour wall-clock
        clearInterval(check);
        handleStopTimer('Auto-stopped after 1 hour of continuous tracking.');
        toast.info('⏱ Timer auto-stopped after 1 hour. Please restart to continue.', { duration: 10000 });
        fireOSNotification('BridgeWorkspace — Timer Auto-Stopped', 'Your 1-hour tracking session has ended. Restart to continue tracking.');
      }
    }, 10000);
    return () => clearInterval(check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer?.startTime]);

  // Heartbeat + Sleep detection (replaces old 5-min auto-stop)
  React.useEffect(() => {
    if (!activeTimer) return;

    // Heartbeat DB ping every 15s
    const heartbeatInterval = setInterval(async () => {
      const isRecentActivity = (Date.now() - lastActivityRef.current) < 5 * 60 * 1000;
      const res = await reportActivityAction(isRecentActivity) as any;

      if (res?.autoStopped) {
        // Server stopped the timer due to allocated hours
        setActiveTimer(null);
        setIsTimerSleeping(false);
        const msg = `⏱ Timer auto-stopped: allocated hours reached for "${res.taskTitle || 'task'}".`;
        toast.warning(msg, { duration: 10000 });
        fireOSNotification('BridgeWorkspace — Allocated Hours Reached', `Your timer was stopped. Allocated hours for "${res.taskTitle || 'the task'}" have been used up.`);
        // Refresh notifications
        fetchNotifications();
        return;
      }

      if (res?.isSleeping && !isTimerSleeping) {
        setIsTimerSleeping(true);
        toast.info('😴 Tracker sleeping — no activity detected for 5 minutes. Idle time won\'t be saved.', { duration: 6000 });
        fireOSNotification('BridgeWorkspace — Tracker Sleeping', 'No activity for 5 minutes. Move your mouse to wake it up.');
      } else if (res?.wokeUp && isTimerSleeping) {
        setIsTimerSleeping(false);
        toast.success('✅ Tracker resumed!', { duration: 3000 });
      }
    }, 15000);

    // Upload screenshot to Cloudinary every 5 minutes (300,000 ms)
    const screenshotInterval = setInterval(() => {
      if (!isTimerSleeping) captureScreenAndUpload();
    }, 300000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(screenshotInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimer, isTimerSleeping]);

  // Capture screen activity & upload to Cloudinary
  const captureScreenAndUpload = React.useCallback(async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = window.innerWidth || 1280;
      canvas.height = window.innerHeight || 720;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`BridgeWorkspace Realtime Screenshot Log - ${new Date().toLocaleTimeString()}`, 30, 50);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(`User: ${user?.name || 'Member'} | Page: ${window.location.pathname}`, 30, 85);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        await uploadScreenshotAction(dataUrl);
      }
    } catch (err) {
      console.error('Failed to upload screenshot:', err);
    }
  }, [user?.name]);

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

  // Instant optimistic start (0ms frontend lag) + async API execution
  const handleStartTimer = (task: any) => {
    const nowStr = new Date().toISOString();
    const optimisticTimer = {
      id: 'timer_' + Date.now(),
      taskId: task.id,
      projectId: task.projectId,
      taskTitle: task.title,
      projectName: task.project?.name || 'Project',
      startTime: nowStr,
      allocatedHours: task.allocatedHours || undefined,
    };

    setActiveTimer(optimisticTimer);
    setIsTimerSleeping(false);
    setIsTimerModalOpen(false);
    lastActivityRef.current = Date.now();
    toast.success(`Timer started for "${task.title}"`);

    setIsStartingTimerId(task.id);
    startTimerAction(task.projectId, task.id).then((res: any) => {
      setIsStartingTimerId(null);
      if (res.error) {
        setActiveTimer(null);
        if (res.code === 'allocated_hours_exceeded') {
          // Open the hours request modal instead of just showing error
          setHoursRequestTask({ id: res.taskId, title: res.taskTitle || task.title });
          setRequestedHours('1');
          setRequestReason('');
          setIsHoursRequestModalOpen(true);
        } else {
          toast.error(res.error);
        }
      } else if (res.timer) {
        setActiveTimer({
          id: res.timer.id,
          taskId: res.timer.taskId || undefined,
          projectId: res.timer.projectId,
          taskTitle: task.title,
          projectName: task.project?.name || 'Project',
          startTime: new Date(res.timer.startTime).toISOString(),
          allocatedHours: task.allocatedHours || undefined,
        });
        captureScreenAndUpload();
      }
    });
  };

  // Instant optimistic stop (0ms frontend lag) + async API execution
  const handleStopTimer = (reason?: string) => {
    if (!activeTimer) return;

    setActiveTimer(null);
    setIsTimerSleeping(false);
    if (!reason) toast.success('Timer stopped & time recorded!');

    setIsStoppingTimer(true);
    stopTimerAction(reason).then(res => {
      setIsStoppingTimer(false);
      if (res.error) {
        toast.error(res.error);
      } else {
        fetchNotifications();
      }
    });
  };

  // Submit additional hours request
  const handleSubmitHoursRequest = async () => {
    if (!hoursRequestTask) return;
    const hrs = parseFloat(requestedHours);
    if (isNaN(hrs) || hrs <= 0) {
      toast.error('Please enter a valid number of hours.');
      return;
    }
    setIsSubmittingRequest(true);
    const res = await requestAdditionalHoursAction(hoursRequestTask.id, hrs, requestReason);
    setIsSubmittingRequest(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setIsHoursRequestModalOpen(false);
      toast.success(`Request for ${hrs}h submitted! Owner/PM will be notified.`, { duration: 6000 });
      fireOSNotification('BridgeWorkspace — Request Submitted', `Your request for ${hrs}h on "${hoursRequestTask.title}" was sent to your Owner/PM.`);
    }
  };

  // Mark notification as read
  const handleMarkRead = async (notifId: string) => {
    await markNotificationReadAction(notifId);
    setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
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
          <div className={`flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-[8px] text-[12px] font-bold shrink-0 transition-all duration-300 ${
            isTimerSleeping
              ? 'bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
              : 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400'
          }`}>
            {isTimerSleeping ? (
              <MoonStar size={12} className="text-slate-400 shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            )}
            <span className="font-mono text-[12.5px] font-black">{formatTimerDigits(elapsedSeconds)}</span>
            {activeTimer.taskTitle && (
              <span className="truncate max-w-[100px] text-[11px] opacity-90 hidden lg:inline">
                {isTimerSleeping ? '😴 Sleeping' : activeTimer.taskTitle}
              </span>
            )}
            <button
              type="button"
              onClick={() => handleStopTimer()}
              disabled={isStoppingTimer}
              className={`p-1 rounded-md transition-colors cursor-pointer ml-0.5 ${
                isTimerSleeping
                  ? 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                  : 'hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
              }`}
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

        {/* Notification Bell */}
        <DropdownMenu open={isNotifOpen} onOpenChange={setIsNotifOpen}>
          <DropdownMenuTrigger asChild>
            <button
              className="relative p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors rounded-full flex items-center justify-center"
              title="Notifications"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[14px] h-[14px] rounded-full bg-red-500 text-white text-[9px] font-black px-0.5 leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 bg-white dark:bg-[#151518] rounded-xl shadow-2xl border border-slate-200/85 dark:border-white/10 p-0 mt-2 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-200">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">{unreadCount} unread</span>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-medium">
                  No notifications yet.
                </div>
              ) : (
                notifications.slice(0, 20).map((notif: any) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                    className={`px-4 py-3 border-b border-slate-50 dark:border-white/5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${
                      !notif.isRead ? 'bg-violet-50/40 dark:bg-violet-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                        !notif.isRead ? 'bg-violet-500' : 'bg-transparent'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                          {notif.title}
                        </div>
                        {notif.message && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">
                            {notif.message}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-slate-100 dark:border-white/5">
              <Link href="/workspace/notifications" onClick={() => setIsNotifOpen(false)}>
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                  View all notifications →
                </span>
              </Link>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
                      {t.allocatedHours && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500">
                          {t.trackedHours?.toFixed(1) || '0'}h / {t.allocatedHours}h
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
          <div className="px-6 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex items-center justify-between">
            <button
              type="button"
              onClick={async () => {
                if (confirm("Are you sure you want to clear all tracked time and reset timers in the database?")) {
                  const res = await clearTrackedTimeAction();
                  if (res.success) {
                    toast.success("All tracked time cleared successfully!");
                    setActiveTimer(null);
                    window.location.reload();
                  } else {
                    toast.error(res.error || "Failed to clear tracked time");
                  }
                }
              }}
              className="text-[11.5px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1 rounded-[6px] transition-colors outline-none cursor-pointer"
            >
              Clear Tracked Time
            </button>
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

      {/* Additional Hours Request Dialog */}
      <Dialog open={isHoursRequestModalOpen} onOpenChange={setIsHoursRequestModalOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md p-0 gap-0 flex flex-col rounded-[8px] overflow-hidden border-orange-200 dark:border-orange-800/40 bg-white dark:bg-[#1f1f1f] shadow-[0_24px_70px_rgba(0,0,0,0.28)] [&>button]:right-5 [&>button]:top-5 [&>button]:text-slate-400 [&>button]:opacity-100 [&>button_svg]:size-5">
          <div className="px-6 py-5 border-b border-slate-200/80 dark:border-white/10">
            <DialogTitle className="pr-10 text-[17px] font-bold text-slate-900 dark:text-white leading-tight tracking-[-0.01em] flex items-center gap-2">
              <AlertTriangle size={16} className="text-orange-500" />
              Request Additional Hours
            </DialogTitle>
            <DialogDescription className="text-[12.5px] leading-5 text-slate-500 dark:text-slate-400 mt-1">
              Allocated hours for <strong className="text-slate-700 dark:text-slate-300">{hoursRequestTask?.title}</strong> are used up. Request more time from your Owner or Project Manager.
            </DialogDescription>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Additional Hours Needed
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={requestedHours}
                onChange={e => setRequestedHours(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] outline-none focus:border-violet-400 dark:text-white placeholder:text-slate-400"
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Reason <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder="Explain why you need more time..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] outline-none focus:border-violet-400 dark:text-white placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsHoursRequestModalOpen(false)}
              className="h-9 px-4 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-[8px] transition-colors outline-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitHoursRequest}
              disabled={isSubmittingRequest}
              className="h-9 px-5 bg-orange-500 hover:bg-orange-600 text-white rounded-[8px] text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmittingRequest ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
              Submit Request
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
