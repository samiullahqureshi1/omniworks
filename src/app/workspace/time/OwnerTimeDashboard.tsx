'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDailyWorksnapsDataAction, getActiveTimerAction } from '@/app/actions/tracking';
import { 
  ChevronLeft, ChevronRight, Plus, Monitor, Clock, Image as ImageIcon,
  LayoutDashboard, Timer, BarChart3, Star, CheckSquare, CalendarDays,
  User, FolderKanban, TrendingUp, Filter, FileText, ArrowUpRight,
  Briefcase, Users, Search, Settings, Share2, Printer, Download, Play, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import AddManualTimeModal from '@/components/modals/AddManualTimeModal';
import { formatHours } from '@/lib/utils';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from 'sonner';
import {
  saveReportAction,
  getSavedReportsAction,
  deleteSavedReportAction,
  type ReportConfig,
} from '@/app/actions/reports';

export default function OwnerTimeDashboard({ initialActiveTimer, timeEntries = [], allUsers = [], allProjects = [], allTasks = [], userRole, currentUserId }: any) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timesheet' | 'reports'>('dashboard');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Real-time Active Timer State
  const [activeTimer, setActiveTimer] = useState<any>(initialActiveTimer || null);
  const [activeElapsedSecs, setActiveElapsedSecs] = useState<number>(0);

  useEffect(() => {
    getActiveTimerAction().then(res => {
      if (res.success && res.timer) {
        setActiveTimer(res.timer);
      } else {
        setActiveTimer(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!activeTimer?.startTime) {
      setActiveElapsedSecs(0);
      return;
    }

    const start = new Date(activeTimer.startTime).getTime();

    const updateSecs = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      setActiveElapsedSecs(diff);
    };

    updateSecs();
    const interval = setInterval(updateSecs, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const nonClientUsers = useMemo(() => {
    return allUsers.filter((u: any) => u.role !== 'CLIENT');
  }, [allUsers]);

  // Start with current user if member, else first non-client user
  const [filterUser, setFilterUser] = useState(() => {
    if (userRole === 'MEMBER') return currentUserId;
    const available = allUsers.filter((u: any) => u.role !== 'CLIENT');
    return available.length > 0 ? available[0].id : '';
  });
  const [filterProject, setFilterProject] = useState('all');
  const [filterTask, setFilterTask] = useState('all');

  // Reports Tab state
  const [reportSubTab, setReportSubTab] = useState<'quick' | 'saved'>('quick');
  const [reportTimePeriod, setReportTimePeriod] = useState('Week');
  const [showLessOptions, setShowLessOptions] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportProject, setReportProject] = useState('all');
  const [reportUser, setReportUser] = useState('all');
  const [reportTask, setReportTask] = useState('all');
  const [reportFromDate, setReportFromDate] = useState('2026-07-27');
  const [reportToDate, setReportToDate] = useState('2026-08-02');

  // Saved reports (persisted). Generate alone never writes to the DB — only
  // "Generate and Save" and "Share Link" do.
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDialogName, setSaveDialogName] = useState('');
  const [activeReportName, setActiveReportName] = useState<string | null>(null);

  const currentReportConfig = (): ReportConfig => ({
    project: reportProject,
    user: reportUser,
    task: reportTask,
    fromDate: reportFromDate,
    toDate: reportToDate,
    timePeriod: reportTimePeriod,
  });

  const applyReportConfig = (cfg: ReportConfig | null) => {
    if (!cfg) return;
    setReportProject(cfg.project || 'all');
    setReportUser(cfg.user || 'all');
    setReportTask(cfg.task || 'all');
    if (cfg.fromDate) setReportFromDate(cfg.fromDate);
    if (cfg.toDate) setReportToDate(cfg.toDate);
    if (cfg.timePeriod) setReportTimePeriod(cfg.timePeriod);
  };

  const refreshSavedReports = React.useCallback(async () => {
    setLoadingSaved(true);
    const res = await getSavedReportsAction();
    setLoadingSaved(false);
    if (res.success && res.reports) setSavedReports(res.reports);
  }, []);

  // Load once so the Saved Reports badge shows a real count immediately.
  useEffect(() => {
    refreshSavedReports();
  }, [refreshSavedReports]);

  // Open a shared report link: /workspace/time?tab=reports&reportId=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get('reportId');
    if (!reportId || savedReports.length === 0) return;
    const match = savedReports.find((r) => r.id === reportId);
    if (!match) return;
    setActiveTab('reports');
    setReportSubTab('quick');
    applyReportConfig(match.config);
    setActiveReportName(match.name);
    setReportGenerated(true);
  }, [savedReports]);

  const persistReport = async (name: string) => {
    const res = await saveReportAction({ name, config: currentReportConfig() });
    if (res.error || !res.success || !res.report) {
      toast.error(res.error || 'Failed to save report.');
      return null;
    }
    await refreshSavedReports();
    return res.report;
  };

  const handleGenerateAndSave = async () => {
    setReportGenerated(true);
    setSaveDialogName(`Time Report ${new Date().toLocaleDateString()}`);
    setSaveDialogOpen(true);
  };

  const confirmSaveReport = async () => {
    const name = saveDialogName.trim();
    if (!name) {
      toast.error('Please enter a report name.');
      return;
    }
    setIsSavingReport(true);
    const report = await persistReport(name);
    setIsSavingReport(false);
    if (report) {
      setActiveReportName(report.name);
      setSaveDialogOpen(false);
      toast.success('Report saved.');
    }
  };

  /** Share Link: persists the report, then copies a shareable URL to the clipboard. */
  const handleShareLink = async () => {
    setIsSavingReport(true);
    const name = activeReportName || `Shared Report ${new Date().toLocaleDateString()}`;
    const report = await persistReport(name);
    setIsSavingReport(false);
    if (!report) return;

    setActiveReportName(report.name);
    const url = `${window.location.origin}/workspace/time?tab=reports&reportId=${report.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Report saved — share link copied to clipboard.');
    } catch {
      // Clipboard can be blocked (insecure context); still give the user the URL.
      window.prompt('Copy this share link:', url);
    }
  };

  const handlePrintReport = () => {
    if (typeof window !== 'undefined') window.print();
  };

  const handleExportCsv = () => {
    const rows: string[][] = [['Project', 'User', 'Task', 'Date', 'Type', 'Minutes']];
    generatedReportData.projectList.forEach((pGroup: any) => {
      Object.values(pGroup.userGroups).forEach((uGroup: any) => {
        uGroup.entries.forEach((e: any) => {
          rows.push([
            pGroup.project.name ?? '',
            uGroup.user.name ?? '',
            e.taskTitle ?? '',
            e.dateStr ?? '',
            e.type ?? '',
            String(e.mins ?? 0),
          ]);
        });
      });
    });
    rows.push(['', '', '', '', 'Grand Total', String(generatedReportData.totalMins)]);

    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = rows.map((r) => r.map(esc).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `time-report-${reportFromDate}_to_${reportToDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('Report exported as CSV.');
  };

  const handleOpenSavedReport = (r: any) => {
    applyReportConfig(r.config);
    setActiveReportName(r.name);
    setReportSubTab('quick');
    setReportGenerated(true);
  };

  const handleDeleteSavedReport = async (id: string) => {
    const res = await deleteSavedReportAction(id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Report deleted.');
    refreshSavedReports();
  };

  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [dailyEntries, setDailyEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Month navigation
  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };
  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Fetch data when date or user changes
  useEffect(() => {
    if (!filterUser) return;
    
    setIsLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    getDailyWorksnapsDataAction(dateStr, filterUser).then(res => {
      if (res.success) {
        setScreenshots(res.screenshots || []);
        setDailyEntries(res.entries || []);
      }
      setIsLoading(false);
    });
  }, [selectedDate, filterUser]);

  const datesWithTime = useMemo(() => {
    const set = new Set<string>();
    timeEntries.forEach((e: any) => {
      if (e.startTime && (e.duration || 0) > 0) {
        const dateStr = new Date(e.startTime).toISOString().split('T')[0];
        set.add(dateStr);
      }
    });
    if (activeTimer) {
      set.add(new Date().toISOString().split('T')[0]);
    }
    return set;
  }, [timeEntries, activeTimer]);

  // Dynamic Week Range calculation
  const reportWeekRange = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diffToMon));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const startStr = `${start.getMonth() + 1}/${start.getDate()}/${start.getFullYear()}`;
    const endStr = `${end.getMonth() + 1}/${end.getDate()}/${end.getFullYear()}`;
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
      label: `Week: ${startStr} - ${endStr}`
    };
  }, [selectedDate]);

  // Keep FROM/TO date inputs in sync when week navigation changes
  useEffect(() => {
    setReportFromDate(reportWeekRange.startStr);
    setReportToDate(reportWeekRange.endStr);
  }, [reportWeekRange]);

  // Dynamic Report data generator (100% pure real data)
  const generatedReportData = useMemo(() => {
    let filtered = timeEntries;
    
    // Filter by project
    if (reportProject !== 'all') {
      filtered = filtered.filter((e: any) => e.projectId === reportProject);
    }
    // Filter by user
    if (reportUser !== 'all') {
      filtered = filtered.filter((e: any) => e.memberId === reportUser);
    }
    // Filter by task
    if (reportTask !== 'all') {
      filtered = filtered.filter((e: any) => e.taskId === reportTask);
    }
    // Filter by date range if specified
    if (reportFromDate && reportToDate) {
      const from = new Date(reportFromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(reportToDate);
      to.setHours(23, 59, 59, 999);

      filtered = filtered.filter((e: any) => {
        const ed = new Date(e.startTime);
        return ed >= from && ed <= to;
      });
    }

    const projectGroups: Record<string, { project: any; userGroups: Record<string, { user: any; entries: any[]; userSubtotal: number }>; projectTotal: number }> = {};

    filtered.forEach((e: any) => {
      const projId = e.projectId || 'unassigned';
      const projObj = allProjects.find((p: any) => p.id === projId) || { id: projId, name: 'General Work' };
      const userId = e.memberId || 'unassigned';
      const userObj = allUsers.find((u: any) => u.id === userId) || { id: userId, name: 'Team Member' };
      const taskObj = allTasks.find((t: any) => t.id === e.taskId) || { id: e.taskId, title: 'Web Development' };

      const mins = Math.round((e.duration || 0) * 60);

      if (!projectGroups[projId]) {
        projectGroups[projId] = { project: projObj, userGroups: {}, projectTotal: 0 };
      }
      if (!projectGroups[projId].userGroups[userId]) {
        projectGroups[projId].userGroups[userId] = { user: userObj, entries: [], userSubtotal: 0 };
      }

      projectGroups[projId].userGroups[userId].entries.push({
        ...e,
        taskTitle: taskObj.title,
        dateStr: new Date(e.startTime || Date.now()).toLocaleDateString(),
        type: e.notes?.toLowerCase().includes('manual') ? 'Manual' : 'Online',
        mins
      });

      projectGroups[projId].userGroups[userId].userSubtotal += mins;
      projectGroups[projId].projectTotal += mins;
    });

    const totalMins = filtered.reduce((acc: number, e: any) => acc + Math.round((e.duration || 0) * 60), 0);

    return { projectList: Object.values(projectGroups), totalMins };
  }, [timeEntries, reportProject, reportUser, reportTask, reportFromDate, reportToDate, allProjects, allUsers, allTasks]);

  // Group screenshots by hour, then 10-minute intervals
  const groupedData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const intervals = [0, 10, 20, 30, 40, 50];

    const result = hours.map(hour => {
      const hourScreenshots = screenshots.filter(s => {
        const d = new Date(s.capturedAt);
        if (filterProject !== 'all' && s.projectId !== filterProject) return false;
        if (filterTask !== 'all' && s.taskId !== filterTask) return false;
        return d.getHours() === hour;
      });

      const mainProject = hourScreenshots.length > 0 && hourScreenshots[0].project ? hourScreenshots[0].project.name : null;

      const slots = intervals.map(interval => {
        const slotScreenshot = hourScreenshots.find(s => {
          const m = new Date(s.capturedAt).getMinutes();
          return m >= interval && m < interval + 10;
        });
        return { interval, screenshot: slotScreenshot };
      });

      return { hour, slots, mainProject, hasData: hourScreenshots.length > 0 };
    });

    return result.filter(r => r.hasData); 
  }, [screenshots, filterProject, filterTask]);

  // Real-time active timer minutes
  const activeTimerMins = useMemo(() => {
    if (!activeTimer) return 0;
    return Math.floor(activeElapsedSecs / 60);
  }, [activeTimer, activeElapsedSecs]);

  // Calculate total time from entries + active timer
  const totalMinutes = useMemo(() => {
    const base = dailyEntries.reduce((acc, e) => acc + (e.duration || 0) * 60, 0);
    const isTodaySelected = selectedDate.toDateString() === new Date().toDateString();
    return Math.round(base + (isTodaySelected ? activeTimerMins : 0));
  }, [dailyEntries, activeTimerMins, selectedDate]);

  // Today and 7-day stats for circular badges & tables
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayEntries = useMemo(() => {
    return timeEntries.filter((e: any) => new Date(e.startTime) >= todayStart);
  }, [timeEntries, todayStart]);

  const weekEntries = useMemo(() => {
    return timeEntries.filter((e: any) => new Date(e.startTime) >= sevenDaysAgo);
  }, [timeEntries, sevenDaysAgo]);

  const todayLoggedMins = useMemo(() => {
    const base = todayEntries.reduce((acc: number, e: any) => acc + (e.duration || 0) * 60, 0);
    return Math.round(base + activeTimerMins);
  }, [todayEntries, activeTimerMins]);

  const weekLoggedMins = useMemo(() => {
    const base = weekEntries.reduce((acc: number, e: any) => acc + (e.duration || 0) * 60, 0);
    return Math.round(base + activeTimerMins);
  }, [weekEntries, activeTimerMins]);

  const todayOnlinePct = useMemo(() => {
    if (todayLoggedMins === 0) return 0;
    const baseActive = todayEntries.reduce((acc: number, e: any) => acc + (e.activeWorkedDuration ?? (e.duration || 0) * 3600), 0);
    const activeSecs = baseActive + (activeTimer ? activeElapsedSecs : 0);
    const totalSecs = todayLoggedMins * 60;
    return totalSecs > 0 ? Math.min(100, Math.round((activeSecs / totalSecs) * 100)) : 0;
  }, [todayLoggedMins, todayEntries, activeTimer, activeElapsedSecs]);

  const weekOnlinePct = useMemo(() => {
    if (weekLoggedMins === 0) return 0;
    const baseActive = weekEntries.reduce((acc: number, e: any) => acc + (e.activeWorkedDuration ?? (e.duration || 0) * 3600), 0);
    const activeSecs = baseActive + (activeTimer ? activeElapsedSecs : 0);
    const totalSecs = weekLoggedMins * 60;
    return totalSecs > 0 ? Math.min(100, Math.round((activeSecs / totalSecs) * 100)) : 0;
  }, [weekLoggedMins, weekEntries, activeTimer, activeElapsedSecs]);

  const todayUsersCount = useMemo(() => {
    const set = new Set(todayEntries.map((e: any) => e.memberId));
    if (activeTimer?.memberId) set.add(activeTimer.memberId);
    return set.size;
  }, [todayEntries, activeTimer]);

  const weekUsersCount = useMemo(() => {
    const set = new Set(weekEntries.map((e: any) => e.memberId));
    if (activeTimer?.memberId) set.add(activeTimer.memberId);
    return set.size;
  }, [weekEntries, activeTimer]);

  const todayProjectsCount = useMemo(() => {
    const set = new Set(todayEntries.map((e: any) => e.projectId));
    if (activeTimer?.projectId) set.add(activeTimer.projectId);
    return set.size;
  }, [todayEntries, activeTimer]);

  const weekProjectsCount = useMemo(() => {
    const set = new Set(weekEntries.map((e: any) => e.projectId));
    if (activeTimer?.projectId) set.add(activeTimer.projectId);
    return set.size;
  }, [weekEntries, activeTimer]);

  // Weekly chart data for Recharts
  const chartColors = ['#0284c7', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0d9488'];

  const weeklyChartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
      const isToday = d.toDateString() === new Date().toDateString();
      
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const dayEntries = timeEntries.filter((e: any) => {
        const ed = new Date(e.startTime);
        return ed >= dayStart && ed <= dayEnd;
      });

      const dayData: any = { date: dateStr };
      nonClientUsers.forEach((u: any) => {
        const uMins = dayEntries.filter((e: any) => e.memberId === u.id).reduce((acc: number, e: any) => acc + (e.duration || 0) * 60, 0);
        const isActiveUser = isToday && activeTimer && (u.id === activeTimer.memberId || u.id === currentUserId);
        dayData[u.name] = Math.round(uMins + (isActiveUser ? activeTimerMins : 0));
      });

      days.push(dayData);
    }
    return days;
  }, [timeEntries, nonClientUsers, activeTimer, activeTimerMins, currentUserId]);

  return (
    <div className="space-y-4">
      {/* Module Header Bar (unfixed, attached to secondary sidebar) */}
      <div className="-mx-6 -mt-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] z-20 mb-3">
        {/* Title Row */}
        <div className="px-6 pt-3 pb-1.5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white">
              <Timer size={12} />
            </span>

            <span className="text-slate-900 dark:text-white font-semibold text-base">
              Timesheet & Reports
            </span>

            <Star size={14} className="text-slate-400 hover:text-yellow-500 cursor-pointer ml-1" />
          </div>
        </div>

        {/* Tabs Row (No inner top border, black underline on active tab) */}
        <div className="px-6 flex items-center gap-6 text-xs font-semibold pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`pb-2 flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === 'dashboard'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
            {activeTab === 'dashboard' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timesheet')}
            className={`pb-2 flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === 'timesheet'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={14} />
            <span>Timesheet</span>
            {activeTab === 'timesheet' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`pb-2 flex items-center gap-1.5 transition-all cursor-pointer relative ${
              activeTab === 'reports'
                ? 'text-slate-900 dark:text-white font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 size={14} />
            <span>Reports</span>
            {activeTab === 'reports' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* ======= DASHBOARD TAB (Worksnaps-style Exact Layout) ======= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* Top Row: 8 Circular Double-Ring Badges (Compact) */}
          <div className="-mx-6 -mt-3 bg-white dark:bg-[#1f1f1f] border-b border-slate-200 dark:border-white/10 px-4 py-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-around gap-2">
              {/* Badge 1 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Clock size={11} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white leading-none">{todayLoggedMins}m</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[75px] leading-tight">Time Logged Today</span>
              </div>

              {/* Badge 2 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Monitor size={11} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 leading-none">{todayOnlinePct}%</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[75px] leading-tight">Online Time Today</span>
              </div>

              {/* Badge 3 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Users size={11} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 leading-none">{todayUsersCount}</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[75px] leading-tight">Users Worked Today</span>
              </div>

              {/* Badge 4 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Briefcase size={11} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 leading-none">{todayProjectsCount}</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[75px] leading-tight">Projects Worked Today</span>
              </div>

              {/* Badge 5 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Clock size={11} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-[10px] font-black text-slate-800 dark:text-white leading-none">{weekLoggedMins}m</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[85px] leading-tight">Time Logged Last 7 Days</span>
              </div>

              {/* Badge 6 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Monitor size={11} className="text-blue-600 dark:text-blue-400" />
                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 leading-none">{weekOnlinePct}%</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[85px] leading-tight">Online Time Last 7 Days</span>
              </div>

              {/* Badge 7 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Users size={11} className="text-indigo-600 dark:text-indigo-400" />
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 leading-none">{weekUsersCount}</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[85px] leading-tight">Users Worked Last 7 Days</span>
              </div>

              {/* Badge 8 */}
              <div className="flex flex-col items-center text-center group cursor-pointer">
                <div className="w-12 h-12 rounded-full border-[2.5px] border-cyan-400 dark:border-cyan-500 p-0.5 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105">
                  <div className="w-full h-full rounded-full border border-cyan-200 dark:border-cyan-800 flex flex-col items-center justify-center bg-cyan-50/50 dark:bg-cyan-950/20">
                    <Briefcase size={11} className="text-purple-600 dark:text-purple-400" />
                    <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 leading-none">{weekProjectsCount}</span>
                  </div>
                </div>
                <span className="text-[9px] font-semibold text-slate-600 dark:text-slate-400 mt-1 max-w-[85px] leading-tight">Projects Worked Last 7 Days</span>
              </div>
            </div>
          </div>

          {/* 2-Column Dashboard Main Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column (60%) */}
            <div className="lg:col-span-7 space-y-3">
              {/* Panel 1: Time Logged (by user) */}
              <div className="rounded-xl bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs">
                <div className="px-3 py-2 bg-slate-50/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Clock size={14} className="text-slate-600 dark:text-slate-400" />
                    <span>Time Logged (by user)</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Summary</span>
                    <span>|</span>
                    <span className="hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">Timeline</span>
                    <Settings size={12} className="hover:text-slate-600 cursor-pointer ml-1" />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[125px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#252528] border-b border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 sticky top-0 z-10 shadow-2xs">
                      <tr>
                        <th className="py-2 px-3">User</th>
                        <th className="py-2 px-3">Time Logged Today</th>
                        <th className="py-2 px-3">Time Logged Last 7 Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-slate-300">
                      {nonClientUsers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-3 text-center text-slate-400">No team members found.</td>
                        </tr>
                      ) : (
                        nonClientUsers.map((u: any) => {
                          const uTodayEntries = todayEntries.filter((e: any) => e.memberId === u.id);
                          const uWeekEntries = weekEntries.filter((e: any) => e.memberId === u.id);

                          const isActiveUser = activeTimer && (u.id === activeTimer.memberId || u.id === currentUserId);
                          const userTodayMins = Math.round(uTodayEntries.reduce((acc: number, e: any) => acc + (e.duration || 0) * 60, 0) + (isActiveUser ? activeTimerMins : 0));
                          const userWeekMins = Math.round(uWeekEntries.reduce((acc: number, e: any) => acc + (e.duration || 0) * 60, 0) + (isActiveUser ? activeTimerMins : 0));

                          const uTodayActiveSecs = uTodayEntries.reduce((acc: number, e: any) => acc + (e.activeWorkedDuration ?? (e.duration || 0) * 3600), 0) + (isActiveUser ? activeElapsedSecs : 0);
                          const uTodayTotalSecs = userTodayMins * 60;
                          const uTodayPct = uTodayTotalSecs > 0 ? Math.min(100, Math.round((uTodayActiveSecs / uTodayTotalSecs) * 100)) : 0;

                          const uWeekActiveSecs = uWeekEntries.reduce((acc: number, e: any) => acc + (e.activeWorkedDuration ?? (e.duration || 0) * 3600), 0) + (isActiveUser ? activeElapsedSecs : 0);
                          const uWeekTotalSecs = userWeekMins * 60;
                          const uWeekPct = uWeekTotalSecs > 0 ? Math.min(100, Math.round((uWeekActiveSecs / uWeekTotalSecs) * 100)) : 0;

                          return (
                            <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="py-2 px-3 flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                <User size={12} className="text-emerald-600" />
                                <span>{u.name}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-red-600 dark:text-red-400">
                                  {userTodayMins} mins {userTodayMins > 0 ? `(${uTodayPct}% Online)` : ''}
                                </span>
                                <Search size={11} className="inline ml-1 text-sky-500 cursor-pointer" />
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-red-600 dark:text-red-400">
                                  {userWeekMins} mins {userWeekMins > 0 ? `(${uWeekPct}% Online)` : ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Panel 2: Time Logged (by project) */}
              <div className="rounded-xl bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 overflow-hidden shadow-xs">
                <div className="px-3 py-2 bg-slate-50/80 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Clock size={14} className="text-slate-600 dark:text-slate-400" />
                    <span>Time Logged (by project)</span>
                  </div>
                  <Settings size={12} className="text-slate-400 hover:text-slate-600 cursor-pointer" />
                </div>

                <div className="overflow-x-auto max-h-[125px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#252528] border-b border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-500 sticky top-0 z-10 shadow-2xs">
                      <tr>
                        <th className="py-2 px-3">Project</th>
                        <th className="py-2 px-3">Time Logged Today</th>
                        <th className="py-2 px-3">Time Logged Last 7 Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium text-slate-700 dark:text-slate-300">
                      {allProjects.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-3 text-center text-slate-400">No projects found.</td>
                        </tr>
                      ) : (
                        allProjects.map((p: any) => {
                          const pTodayEntries = todayEntries.filter((e: any) => e.projectId === p.id);
                          const pWeekEntries = weekEntries.filter((e: any) => e.projectId === p.id);

                          const isActiveProject = activeTimer && p.id === activeTimer.projectId;
                          const projTodayMins = Math.round(pTodayEntries.reduce((acc: number, e: any) => acc + (e.duration || 0) * 60, 0) + (isActiveProject ? activeTimerMins : 0));
                          const projWeekMins = Math.round(pWeekEntries.reduce((acc: number, e: any) => acc + (e.duration || 0) * 60, 0) + (isActiveProject ? activeTimerMins : 0));

                          const pWeekActiveSecs = pWeekEntries.reduce((acc: number, e: any) => acc + (e.activeWorkedDuration ?? (e.duration || 0) * 3600), 0) + (isActiveProject ? activeElapsedSecs : 0);
                          const pWeekTotalSecs = projWeekMins * 60;
                          const pWeekPct = pWeekTotalSecs > 0 ? Math.min(100, Math.round((pWeekActiveSecs / pWeekTotalSecs) * 100)) : 0;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="py-2 px-3 flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                                <FolderKanban size={12} className="text-blue-600" />
                                <span>{p.name}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-red-600 dark:text-red-400">{projTodayMins} mins</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-red-600 dark:text-red-400">
                                  {projWeekMins} mins {projWeekMins > 0 ? `(${pWeekPct}% Online)` : ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column (40%): Weekly Chart */}
            <div className="lg:col-span-5 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <BarChart3 size={14} className="text-slate-600 dark:text-slate-400" />
                  <span>Weekly Chart</span>
                </div>
                <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">&lt; 7 Days &gt;</span>
              </div>

              <div className="h-[210px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }} 
                      itemStyle={{ color: '#fff' }}
                    />
                    {nonClientUsers.map((u: any, index: number) => (
                      <Line 
                        key={u.id} 
                        type="monotone" 
                        dataKey={u.name} 
                        stroke={chartColors[index % chartColors.length]} 
                        strokeWidth={2} 
                        dot={{ r: 3.5, strokeWidth: 1.5, fill: '#fff' }} 
                        activeDot={{ r: 5 }} 
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======= TIMESHEET TAB ======= */}
      {activeTab === 'timesheet' && (
        <div className="space-y-4">
          {/* Top Banner & Project Dropdown (Attached to sidebar, rounded-none) */}
          <div className="-mx-6 -mt-3 flex justify-between items-center bg-white dark:bg-[#1f1f1f] px-6 py-3 border-b border-slate-200 dark:border-white/10 rounded-none shadow-2xs">
            <div className="flex flex-col items-start justify-center border-l-4 border-emerald-600 px-4 py-0.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{Math.round(totalMinutes)}</span>
                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">mins</span>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                Total Time <span className="cursor-pointer text-sky-500 font-bold">?</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="bg-slate-400 dark:bg-slate-700 text-white px-2.5 py-1 text-xs font-bold rounded-[8px] tracking-wider">PROJECT</span>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-xs font-medium h-8 w-56 px-2.5 shadow-xs focus:outline-none"
              >
                <option value="all">All Projects</option>
                {allProjects.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Full-Width Calendar Strip (Attached to sidebar, rounded-none) */}
          <div className="-mx-6 bg-white dark:bg-[#1f1f1f] px-6 py-2.5 border-b border-slate-200 dark:border-white/10 rounded-none space-y-2 shadow-2xs overflow-x-auto">
            <div className="flex items-center gap-2 font-bold text-sky-600 dark:text-sky-400 text-sm mb-1">
              <span className="cursor-pointer hover:underline" onClick={prevMonth}>&lt;</span>
              <span>{monthName}</span>
              <span className="cursor-pointer hover:underline" onClick={nextMonth}>&gt;</span>
            </div>

            <div className="flex gap-1 min-w-max">
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).substring(0, 2).toUpperCase();
                const isWeekend = dayName === 'SA' || dayName === 'SU';
                
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
                const dayDateStr = d.toISOString().split('T')[0];
                const hasLoggedTime = datesWithTime.has(dayDateStr);

                return (
                  <div 
                    key={day}
                    onClick={() => setSelectedDate(d)}
                    className={`flex flex-col items-center justify-between w-9 h-11 border cursor-pointer transition-colors rounded-[6px] py-0.5
                      ${isSelected ? 'border-2 border-red-500 bg-red-50/50 dark:bg-red-950/20 font-bold' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}
                    `}
                  >
                    <span className={`text-[9px] font-bold ${isWeekend ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>{dayName}</span>
                    <span className={`text-xs font-bold ${isSelected ? 'text-slate-900 dark:text-white' : isWeekend ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>{day}</span>
                    <div className="w-full h-1">
                      {hasLoggedTime && <div className="w-full h-full bg-emerald-500 rounded-full opacity-80" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters Toolbar Bar (Attached to sidebar, rounded-none) */}
          <div className="-mx-6 bg-slate-100/80 dark:bg-white/5 px-6 py-2.5 border-b border-slate-200 dark:border-white/10 rounded-none flex flex-wrap gap-3 items-center justify-between shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* USER */}
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-400 dark:bg-slate-700 text-white px-2.5 py-1 text-[11px] font-bold rounded-[8px]">USER</span>
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="border border-slate-300 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white rounded-[8px] text-xs font-medium h-7 px-2.5"
                  disabled={userRole === 'MEMBER'}
                >
                  {userRole === 'MEMBER' 
                    ? <option value={currentUserId}>{allUsers.find((u: any) => u.id === currentUserId)?.name || 'You'}</option>
                    : allUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))
                  }
                </select>
              </div>

              {/* DATE */}
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-400 dark:bg-slate-700 text-white px-2.5 py-1 text-[11px] font-bold rounded-[8px]">DATE</span>
                <div className="flex items-center border border-slate-300 dark:border-white/10 dark:bg-[#1f1f1f] rounded-[8px] text-xs font-medium h-7 px-1.5 bg-white">
                  <span className="cursor-pointer px-1 text-slate-500 hover:text-slate-900" onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}>&lt;</span>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="border-none bg-transparent dark:text-white text-xs h-full focus:outline-none"
                  />
                  <span className="cursor-pointer px-1 text-slate-500 hover:text-slate-900" onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}>&gt;</span>
                </div>
              </div>

              {/* TASK */}
              <div className="flex items-center gap-1.5">
                <span className="bg-slate-400 dark:bg-slate-700 text-white px-2.5 py-1 text-[11px] font-bold rounded-[8px]">TASK</span>
                <select
                  value={filterTask}
                  onChange={(e) => setFilterTask(e.target.value)}
                  className="border border-slate-300 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-white rounded-[8px] text-xs font-medium h-7 w-44 truncate px-2.5"
                >
                  <option value="all">--- All Tasks ---</option>
                  {allTasks.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Action buttons */}
            <div className="flex items-center gap-2">
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 text-xs font-bold rounded-[8px] flex items-center gap-1">
                <Clock size={12} /> GMT+5
              </span>
              <button 
                type="button"
                className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 px-2.5 py-1 text-xs font-bold rounded-[8px] flex items-center gap-1 shadow-2xs hover:bg-slate-50"
              >
                <Settings size={12} /> Actions ⌄
              </button>
            </div>
          </div>

          {/* Grid Worksnaps Workspaces Screenshots Display (Attached to sidebar, rounded-none, internal scroll) */}
          {isLoading ? (
            <div className="flex justify-center p-10"><Clock className="animate-spin text-gray-400 dark:text-slate-500" /></div>
          ) : groupedData.length === 0 ? (
            <div className="-mx-6 border-b border-slate-200 dark:border-white/10 text-center p-10 text-slate-500 dark:text-slate-400 bg-white dark:bg-[#1f1f1f] rounded-none shadow-2xs font-semibold text-xs">
              No time tracked for this day.
            </div>
          ) : (
            <div className="-mx-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] rounded-none shadow-2xs max-h-[360px] overflow-y-auto">
              {/* Header Interval Column Bar */}
              <div className="grid grid-cols-7 bg-slate-200/80 dark:bg-white/10 border-b border-slate-300 dark:border-white/10 font-bold text-slate-700 dark:text-slate-200 text-xs text-center">
                <div className="p-2 flex items-center justify-center border-r border-slate-300 dark:border-white/10">Hour</div>
                <div className="p-2 flex items-center justify-center border-r border-slate-300 dark:border-white/10">:00 TO :10</div>
                <div className="p-2 flex items-center justify-center border-r border-slate-300 dark:border-white/10">:10 TO :20</div>
                <div className="p-2 flex items-center justify-center border-r border-slate-300 dark:border-white/10">:20 TO :30</div>
                <div className="p-2 flex items-center justify-center border-r border-slate-300 dark:border-white/10">:30 TO :40</div>
                <div className="p-2 flex items-center justify-center border-r border-slate-300 dark:border-white/10">:40 TO :50</div>
                <div className="p-2 flex items-center justify-center">:50 TO :60</div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-white/10">
                {groupedData.map((hourData, i) => (
                  <div key={i} className="flex flex-col">
                    <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-white/10 min-h-[130px]">
                      {/* Hour Label */}
                      <div className="p-2 flex flex-col items-start justify-center font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-[#1f1f1f]">
                        <div className="flex gap-2 items-center">
                          <input type="checkbox" className="rounded border-slate-300" />
                          <span className="text-base font-black">
                            {hourData.hour === 0 ? '12am' : hourData.hour < 12 ? `${hourData.hour}am` : hourData.hour === 12 ? '12pm' : `${hourData.hour - 12}pm`}
                          </span>
                        </div>
                      </div>

                      {/* 6 Interval Slots */}
                      {hourData.slots.map((slot, j) => (
                        <div key={j} className="p-1.5 flex flex-col items-center justify-center space-y-1 hover:bg-slate-50 dark:hover:bg-white/5 relative">
                          {slot.screenshot ? (
                            <div className="w-full flex flex-col items-center border-2 border-slate-400 dark:border-slate-600 p-0.5 rounded-sm relative group bg-white dark:bg-[#1f1f1f] shadow-xs">
                              {/* Top Left Checkbox inside Frame */}
                              <div className="absolute top-1 left-1 z-10">
                                <input type="checkbox" className="rounded border-slate-400" />
                              </div>
                              
                              {/* Top Right Gear / Monitor Icons */}
                              <div className="absolute top-1 right-1 z-10 flex gap-1 bg-white/80 dark:bg-black/60 rounded px-1 text-slate-600 dark:text-slate-300">
                                <Settings size={10} className="cursor-pointer hover:text-blue-600" />
                                <Monitor size={10} className="cursor-pointer hover:text-blue-600" />
                              </div>

                              {slot.screenshot.screenshotUrl ? (
                                <img src={slot.screenshot.screenshotUrl} alt="Screenshot" className="w-full h-[65px] object-cover cursor-pointer rounded-xs" />
                              ) : (
                                <div className="w-full h-[65px] bg-slate-800 flex items-center justify-center text-xs text-white">
                                  No Image
                                </div>
                              )}
                              
                              {/* Center Hover Blue Click Button */}
                              <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm cursor-pointer">
                                  Click for more
                                </span>
                              </div>
                              
                              {/* Bottom 10 Activity Level Segmented Bars */}
                              <div className="flex gap-[1px] mt-1 w-full justify-center px-0.5 pb-0.5">
                                {Array.from({ length: 10 }).map((_, idx) => {
                                  const level = (slot.screenshot.activityLevel || 50) / 10;
                                  return (
                                    <div key={idx} className={`h-1.5 flex-1 rounded-xs ${idx < level ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {/* Worksnaps Blue Project Banner Bar */}
                    {hourData.mainProject && (
                      <div className="bg-[#467B92] text-white text-xs font-bold px-3 py-1 w-full truncate flex items-center justify-between">
                        <span>[Project: {hourData.mainProject}] Web Development</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}



      {/* ======= REPORTS TAB ======= */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Sub-Header Tabs Row (Quick Report / Saved Reports) */}
          <div className="-mx-6 border-b border-slate-200 dark:border-white/10 px-6 flex items-center gap-4 text-xs font-semibold bg-slate-50/50 dark:bg-white/5 pt-2">
            <button
              type="button"
              onClick={() => setReportSubTab('quick')}
              className={`px-3 py-2 border-t border-x rounded-t-[6px] border-slate-300 dark:border-white/10 transition-all font-bold ${
                reportSubTab === 'quick'
                  ? 'bg-white dark:bg-[#1f1f1f] text-slate-900 dark:text-white border-b-white dark:border-b-[#1f1f1f] -mb-px'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Quick Report
            </button>
            <button
              type="button"
              onClick={() => setReportSubTab('saved')}
              className={`flex items-center gap-1.5 cursor-pointer py-2 ${
                reportSubTab === 'saved'
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-sky-600 dark:text-sky-400 hover:underline'
              }`}
            >
              <span>Saved Reports</span>
              {/* Real count from the database, not a placeholder. */}
              <span className="bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                {loadingSaved ? '…' : savedReports.length}
              </span>
            </button>
          </div>

          {/* ── SAVED REPORTS SUB-TAB ── */}
          {reportSubTab === 'saved' && (
            <div className="-mx-6 bg-white dark:bg-[#1f1f1f] border-b border-slate-200 dark:border-white/10 rounded-none shadow-2xs">
              {loadingSaved ? (
                <div className="p-10 text-center text-sm text-slate-400">Loading saved reports…</div>
              ) : savedReports.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="p-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full">
                    <FileText size={28} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm">
                    No saved reports yet. Use <span className="font-bold">Generate and Save</span> or{' '}
                    <span className="font-bold">Share Link</span> to save one.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-4">Report Name</th>
                      <th className="py-2.5 px-4">Range</th>
                      <th className="py-2.5 px-4">Saved</th>
                      <th className="py-2.5 px-4 text-right pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {savedReports.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] text-slate-700 dark:text-slate-300">
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">{r.name}</td>
                        <td className="py-2.5 px-4">
                          {r.config?.fromDate || '—'} → {r.config?.toDate || '—'}
                        </td>
                        <td className="py-2.5 px-4">{new Date(r.createdAt).toLocaleDateString()}</td>
                        <td className="py-2.5 px-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenSavedReport(r)}
                              className="border border-slate-300 dark:border-white/10 rounded-[6px] px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-white/5"
                            >
                              Open
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const url = `${window.location.origin}/workspace/time?tab=reports&reportId=${r.id}`;
                                try {
                                  await navigator.clipboard.writeText(url);
                                  toast.success('Share link copied to clipboard.');
                                } catch {
                                  window.prompt('Copy this share link:', url);
                                }
                              }}
                              className="border border-slate-300 dark:border-white/10 rounded-[6px] px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-white/5"
                            >
                              Copy link
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSavedReport(r.id)}
                              className="border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-[6px] px-2.5 py-1 font-semibold hover:bg-red-50 dark:hover:bg-red-950/20"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Filter Card Container (Attached edge-to-edge, rounded-none) */}
          <div className={`-mx-6 bg-white dark:bg-[#1f1f1f] border-b border-slate-200 dark:border-white/10 rounded-none p-4 space-y-3 shadow-2xs ${reportSubTab === 'quick' ? '' : 'hidden'}`}>
            {/* Gray Week Navigation Box */}
            <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-[8px] p-3 flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <ChevronLeft 
                  size={16} 
                  className="cursor-pointer text-slate-600 hover:text-slate-900" 
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 7 * 86400000))}
                />
                <span>{reportWeekRange.label}</span>
                <ChevronRight 
                  size={16} 
                  className="cursor-pointer text-slate-600 hover:text-slate-900" 
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 7 * 86400000))}
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span>Time Period</span>
                <select
                  value={reportTimePeriod}
                  onChange={(e) => setReportTimePeriod(e.target.value)}
                  className="border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-xs px-3 py-1.5 focus:outline-none bg-white"
                >
                  <option value="Week">Week</option>
                  <option value="Day">Day</option>
                  <option value="Month">Month</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
            </div>

            {/* Show less / Show more options toggle link */}
            <div className="flex justify-center border-t border-slate-100 dark:border-white/5 pt-1">
              <button
                type="button"
                onClick={() => setShowLessOptions(!showLessOptions)}
                className="text-xs text-sky-500 hover:text-sky-600 font-medium flex items-center gap-1 cursor-pointer"
              >
                {showLessOptions ? (
                  <>
                    <ChevronDown size={14} /> <span>Show more options</span>
                  </>
                ) : (
                  <>
                    <ChevronUp size={14} /> <span>Show less options</span>
                  </>
                )}
              </button>
            </div>

            {/* Filter Controls Row (Hidden when showLessOptions is true) */}
            {!showLessOptions && (
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1 border-t border-slate-100 dark:border-white/5">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">PROJECT</label>
                  <select
                    value={reportProject}
                    onChange={(e) => setReportProject(e.target.value)}
                    className="w-full border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-xs px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Projects</option>
                    {allProjects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">USER</label>
                  <select
                    value={reportUser}
                    onChange={(e) => setReportUser(e.target.value)}
                    className="w-full border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-xs px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Assigned Users</option>
                    {allUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">TASK</label>
                  <select
                    value={reportTask}
                    onChange={(e) => setReportTask(e.target.value)}
                    className="w-full border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-xs px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="all">All Tasks</option>
                    {allTasks.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">FROM</label>
                  <input
                    type="date"
                    value={reportFromDate}
                    onChange={(e) => setReportFromDate(e.target.value)}
                    className="w-full border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-xs px-2.5 py-1.5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">TO</label>
                  <input
                    type="date"
                    value={reportToDate}
                    onChange={(e) => setReportToDate(e.target.value)}
                    className="w-full border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-xs px-2.5 py-1.5 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons Bar */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReportGenerated(true)}
                className="bg-[#00A669] hover:bg-[#008A57] text-white font-semibold text-xs px-4 py-2 rounded-[8px] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              >
                <Play size={13} className="fill-white" />
                <span>Generate</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateAndSave}
                disabled={isSavingReport}
                className="bg-[#0088CC] hover:bg-[#0077B3] disabled:opacity-60 text-white font-semibold text-xs px-4 py-2 rounded-[8px] flex items-center gap-1.5 shadow-2xs cursor-pointer transition-all"
              >
                <Save size={13} />
                <span>{isSavingReport ? 'Saving…' : 'Generate and Save'}</span>
              </button>
            </div>
          </div>

          {/* Results Area */}
          {reportSubTab !== 'quick' ? null : !reportGenerated ? (
            /* Initial State: Funnel Placeholder Box (Attached edge-to-edge, rounded-none) */
            <div className="-mx-6 border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] rounded-none p-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full shadow-2xs">
                <Filter size={32} className="text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 max-w-sm">
                Choose a period and run the report to see tracked time.
              </p>
            </div>
          ) : (
            /* Generated State: Worksnaps Dynamic Detailed Table View */
            <div className="space-y-3">
              {/* Header Bar with Grand Total and Actions */}
              <div className="-mx-6 bg-slate-100 dark:bg-white/5 border-y border-slate-200 dark:border-white/10 px-6 py-2.5 flex flex-wrap justify-between items-center rounded-none shadow-2xs">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  Grand Total: {generatedReportData.totalMins} mins
                </span>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={handleShareLink}
                    disabled={isSavingReport}
                    title="Saves the report and copies a shareable link"
                    className="border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-200 rounded-[8px] text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Share2 size={13} /> {isSavingReport ? 'Saving…' : 'Share Link'}
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintReport}
                    className="border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-200 rounded-[8px] text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 shadow-2xs hover:bg-slate-50"
                  >
                    <Printer size={13} /> Print
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="border border-slate-300 dark:border-white/10 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-200 rounded-[8px] text-xs font-semibold px-3 py-1.5 flex items-center gap-1.5 shadow-2xs hover:bg-slate-50"
                  >
                    <Download size={13} /> Export as CSV
                  </button>
                </div>
              </div>

              {/* Grouped Table View (Attached to sidebar, rounded-none) */}
              <div className="-mx-6 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] rounded-none overflow-x-auto shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white dark:bg-[#1f1f1f] border-b border-slate-200 dark:border-white/10 font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Task</th>
                      <th className="py-2.5 px-4">Date</th>
                      <th className="py-2.5 px-4">Type</th>
                      <th className="py-2.5 px-4 text-right pr-6">Time Logged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {generatedReportData.projectList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No time logged for selected filters.
                        </td>
                      </tr>
                    ) : (
                      generatedReportData.projectList.map((pGroup: any) => (
                        <React.Fragment key={pGroup.project.id}>
                          {/* Project Header Banner */}
                          <tr className="bg-[#E2E2E2] dark:bg-slate-800 border-y border-slate-300 dark:border-white/10 font-bold text-slate-900 dark:text-white text-xs">
                            <td colSpan={5} className="py-2 px-4">
                              <span className="bg-slate-400 dark:bg-slate-700 text-white px-2 py-0.5 text-[10px] font-bold rounded-[4px] mr-2">PROJECT</span>
                              <span>{pGroup.project.name}</span>
                            </td>
                          </tr>

                          {/* Users inside Project */}
                          {Object.values(pGroup.userGroups).map((uGroup: any) => (
                            <React.Fragment key={uGroup.user.id}>
                              {uGroup.entries.map((entry: any, eIdx: number) => (
                                <tr key={eIdx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] text-slate-700 dark:text-slate-300 font-medium">
                                  <td className="py-2 px-4">{uGroup.user.name}</td>
                                  <td className="py-2 px-4">{entry.taskTitle}</td>
                                  <td className="py-2 px-4">{entry.dateStr}</td>
                                  <td className="py-2 px-4">{entry.type}</td>
                                  <td className="py-2 px-4 text-right pr-6 font-semibold">{entry.mins} mins</td>
                                </tr>
                              ))}

                              {/* User Subtotal Row */}
                              <tr className="bg-slate-50/80 dark:bg-white/[0.01] border-b border-slate-100 dark:border-white/5 font-semibold text-slate-500 text-xs">
                                <td colSpan={5} className="py-1.5 px-4 text-right pr-6">
                                  User Subtotal: {uGroup.userSubtotal} mins
                                </td>
                              </tr>
                            </React.Fragment>
                          ))}

                          {/* Project Total Row */}
                          <tr className="bg-slate-100/70 dark:bg-white/5 border-b-2 border-slate-200 dark:border-white/10 font-black text-slate-900 dark:text-white text-xs">
                            <td colSpan={4} className="py-2 px-4 font-bold">Project Total</td>
                            <td className="py-2 px-4 text-right pr-6 font-black">{pGroup.projectTotal} mins</td>
                          </tr>
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Save-report name dialog (only shown for "Generate and Save") */}
          {saveDialogOpen && (
            <div
              className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-[1px] flex items-center justify-center p-4 print:hidden"
              onClick={() => setSaveDialogOpen(false)}
            >
              <div
                className="w-full max-w-sm bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-[10px] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10">
                  <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Save report</h3>
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Saved reports keep your filters and re-run against current data.
                  </p>
                </div>
                <div className="px-5 py-4">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Report name
                  </label>
                  <input
                    autoFocus
                    value={saveDialogName}
                    onChange={(e) => setSaveDialogName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmSaveReport(); }}
                    placeholder="e.g. August client hours"
                    className="w-full border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="px-5 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveDialogOpen(false)}
                    disabled={isSavingReport}
                    className="text-xs font-semibold px-3 py-1.5 rounded-[8px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmSaveReport}
                    disabled={isSavingReport}
                    className="bg-[#0088CC] hover:bg-[#0077B3] disabled:opacity-60 text-white font-semibold text-xs px-4 py-1.5 rounded-[8px]"
                  >
                    {isSavingReport ? 'Saving…' : 'Save report'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <AddManualTimeModal 
          isOpen={isModalOpen}
          onClose={(refresh) => {
            setIsModalOpen(false);
            if (refresh) {
              const d = selectedDate;
              setSelectedDate(new Date(d.getTime() - 1));
              setTimeout(() => setSelectedDate(d), 10);
            }
          }}
          allProjects={allProjects}
          allTasks={allTasks || []}
          allUsers={allUsers}
          defaultDate={selectedDate.toISOString().split('T')[0]}
          defaultUserId={filterUser}
        />
      )}

      {/* Name-the-report dialog (shown by "Generate and Save") */}
      {saveDialogOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-[1px] flex items-center justify-center p-4 print:hidden"
          onClick={() => !isSavingReport && setSaveDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-[10px] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200/80 dark:border-white/10">
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">Save report</h3>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                Saved reports keep their filters and re-run against current time entries.
              </p>
            </div>
            <div className="px-5 py-4">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Report name
              </label>
              <input
                autoFocus
                value={saveDialogName}
                onChange={(e) => setSaveDialogName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmSaveReport(); }}
                placeholder="e.g. August client hours"
                className="w-full border border-slate-300 dark:border-white/10 dark:bg-[#151518] dark:text-white rounded-[8px] text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-[#19191c] flex justify-end gap-2">
              <button
                type="button"
                disabled={isSavingReport}
                onClick={() => setSaveDialogOpen(false)}
                className="text-xs font-semibold px-3 py-2 rounded-[8px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingReport}
                onClick={confirmSaveReport}
                className="bg-[#0088CC] hover:bg-[#0077B3] text-white text-xs font-semibold px-4 py-2 rounded-[8px] disabled:opacity-60"
              >
                {isSavingReport ? 'Saving…' : 'Save report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
