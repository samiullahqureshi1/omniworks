'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Play,
  Square,
  Building2,
  CheckSquare,
  Clock,
  Zap,
} from 'lucide-react';
import { getDesktopHeaderDataAction } from '@/app/actions/desktop';
import { startTimerAction, stopTimerAction } from '@/app/actions/tracking';
import { switchOrganizationAction } from '@/app/actions/auth';

type OrgOption = { id: string; name: string; isCurrent: boolean };
type TaskOption = { id: string; title: string; projectId: string; projectName: string; statusName: string };

function formatHHMMSS(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function DesktopHeader() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  
  // Timer State
  const [isTracking, setIsTracking] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTaskTitle, setActiveTaskTitle] = useState<string>('');
  const [timerSubmitting, setTimerSubmitting] = useState(false);

  // Load Header Data
  const loadHeaderData = async () => {
    const res = await getDesktopHeaderDataAction();
    if (res.success) {
      setOrganizations(res.organizations || []);
      setSelectedOrgId(res.currentOrgId || '');
      setTasks(res.tasks || []);
      
      if (res.tasks && res.tasks.length > 0 && !selectedTaskId) {
        setSelectedTaskId(res.tasks[0].id);
      }

      if (res.activeTimer) {
        setIsTracking(true);
        setActiveTaskTitle(res.activeTimer.taskTitle || 'Task');
        const start = new Date(res.activeTimer.startTime).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.max(0, Math.floor((now - start) / 1000)));
      } else {
        setIsTracking(false);
        setElapsedSeconds(0);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHeaderData();
  }, []);

  // Real-time HH:MM:SS Ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking]);

  // Listen for Electron IPC timer events if running in Electron
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      const api = (window as any).electronAPI;
      if (api.onTimerTick) {
        api.onTimerTick((data: any) => {
          if (data && data.activeWorkedDuration) {
            setElapsedSeconds(data.activeWorkedDuration);
          }
        });
      }
      if (api.onForceUiStop) {
        api.onForceUiStop(() => {
          setIsTracking(false);
          setElapsedSeconds(0);
        });
      }
    }
  }, []);

  // Handle Switch Organization
  const handleOrgChange = async (orgId: string) => {
    if (orgId === selectedOrgId) return;
    setSelectedOrgId(orgId);
    setLoading(true);
    const res = await switchOrganizationAction(orgId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Organization switched');
      window.location.reload();
    }
  };

  // Start Time Tracking
  const handleStartTimer = async () => {
    if (!selectedTaskId) {
      toast.error('Please select a task to track time.');
      return;
    }
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) {
      toast.error('Selected task invalid.');
      return;
    }

    setTimerSubmitting(true);
    const res = await startTimerAction(task.projectId, task.id);
    setTimerSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      setIsTracking(true);
      setElapsedSeconds(0);
      setActiveTaskTitle(task.title);
      toast.success(`Tracking started for: ${task.title}`);

      // Notify Electron main process
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        (window as any).electronAPI.startTimer({
          projectId: task.projectId,
          taskId: task.id,
          taskTitle: task.title,
        });
      }
    }
  };

  // Stop Time Tracking
  const handleStopTimer = async () => {
    setTimerSubmitting(true);
    const res = await stopTimerAction();
    setTimerSubmitting(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      setIsTracking(false);
      setElapsedSeconds(0);
      toast.success('Time tracking stopped.');

      // Notify Electron main process
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        (window as any).electronAPI.stopTimer();
      }
    }
  };

  return (
    <header className="w-full bg-[#16181a] text-white border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-sm relative z-40">
      {/* Left: App Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
          <Zap className="w-4 h-4 text-white fill-white" />
        </div>
        <div>
          <h1 className="text-sm font-black tracking-tight leading-none text-white">BridgeWorkspace</h1>
          <span className="text-[10px] font-bold text-slate-400">Desktop Client</span>
        </div>
      </div>

      {/* Middle: Organization & Task Selectors */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Dropdown 1: Organization Switcher */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs">
          <Building2 size={14} className="text-slate-400 shrink-0" />
          <select
            value={selectedOrgId}
            onChange={(e) => handleOrgChange(e.target.value)}
            disabled={loading || isTracking}
            className="bg-transparent text-white font-semibold text-xs outline-none cursor-pointer border-none focus:ring-0"
          >
            {organizations.map((org) => (
              <option key={org.id} value={org.id} className="bg-[#16181a] text-white">
                {org.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 2: Task Selector */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs max-w-[260px]">
          <CheckSquare size={14} className="text-slate-400 shrink-0" />
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={loading || isTracking}
            className="bg-transparent text-white font-semibold text-xs outline-none cursor-pointer border-none focus:ring-0 truncate w-full"
          >
            {tasks.length === 0 ? (
              <option value="" className="bg-[#16181a] text-slate-400">
                No active tasks found
              </option>
            ) : (
              tasks.map((t) => (
                <option key={t.id} value={t.id} className="bg-[#16181a] text-white">
                  {t.title} ({t.projectName})
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Right: Real-time Time Tracker Button & Live Clock */}
      <div className="flex items-center gap-3">
        {isTracking ? (
          <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 px-3.5 py-1 rounded-full animate-pulse-subtle">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-black tracking-wider text-red-400 leading-none">
                  Tracking Active
                </span>
                <span className="text-xs font-mono font-bold text-white tracking-widest leading-tight">
                  {formatHHMMSS(elapsedSeconds)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStopTimer}
              disabled={timerSubmitting}
              className="ml-2 h-7 px-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Square size={12} className="fill-white" />
              <span>Stop</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleStartTimer}
            disabled={timerSubmitting || !selectedTaskId}
            className="h-8 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            <Play size={13} className="fill-white" />
            <span>Start Tracking</span>
          </button>
        )}
      </div>
    </header>
  );
}
