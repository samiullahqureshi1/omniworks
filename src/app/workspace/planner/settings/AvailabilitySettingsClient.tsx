'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CalendarClock,
  Clock,
  Globe,
  Users,
  CalendarOff,
  Plus,
  X,
  Link2,
  Copy,
  Video,
  CheckCircle2,
  List,
  Calendar,
  RotateCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { updateAvailabilitySettingsAction, disconnectGoogleAction } from '@/app/actions/availability';

type Settings = {
  workingDays: number[];
  workingHoursStart: number;
  workingHoursEnd: number;
  timezone: string;
  slotDurationMinutes: number;
  blockedDates: string[];
  defaultIntroCallAttendeeId: string | null;
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_SHORT_CODES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

function minutesToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
function minutesTo12H(m: number) {
  const hour24 = Math.floor(m / 60);
  const mins = m % 60;
  const ampm = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(mins).padStart(2, '0')}${ampm}`;
}
function hhmmToMinutes(s: string) {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const GOOGLE_STATUS_MESSAGES: Record<string, { type: 'success' | 'error'; msg: string }> = {
  connected: { type: 'success', msg: 'Google Calendar connected.' },
  denied: { type: 'error', msg: 'Google connection was cancelled.' },
  error: { type: 'error', msg: 'Could not connect Google. Please try again.' },
  not_configured: { type: 'error', msg: 'Google is not configured on the server (missing env keys).' },
  no_refresh_token: { type: 'error', msg: 'Google did not return a refresh token. Remove app access in your Google account and retry.' },
};

function GoogleCalendar31Icon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-white border border-slate-200/80 shadow-sm p-1 ${className}`}>
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" fill="#FFFFFF" />
        <path d="M3 9H21V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9Z" fill="#F8FAFC" />
        <path d="M3 6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V9H3V6Z" fill="#4285F4" />
        <circle cx="7" cy="6.5" r="1" fill="#EA4335" />
        <circle cx="17" cy="6.5" r="1" fill="#FBBC04" />
        <text x="12" y="17.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#1E293B" fontFamily="Inter, system-ui, sans-serif">31</text>
      </svg>
    </div>
  );
}

export default function AvailabilitySettingsClient({
  initialSettings,
  hosts,
  appUrl,
  orgParam,
  googleConfigured,
  googleConnectedEmail,
  googleStatus,
}: {
  initialSettings: Settings;
  hosts: Array<{ id: string; name: string; email: string; role: string }>;
  appUrl: string;
  orgParam: string;
  googleConfigured: boolean;
  googleConnectedEmail: string | null;
  googleStatus: string | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'schedules' | 'calendar' | 'advanced'>('schedules');
  const [schedulesViewMode, setSchedulesViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedSchedule, setSelectedSchedule] = useState('working-hours');

  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<Settings>(initialSettings);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [isAddingBlockedDate, setIsAddingBlockedDate] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [includeBuffers, setIncludeBuffers] = useState(false);
  const [autoSync, setAutoSync] = useState(true);

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!googleStatus) return;
    const m = GOOGLE_STATUS_MESSAGES[googleStatus];
    if (m) m.type === 'success' ? toast.success(m.msg) : toast.error(m.msg);
    router.replace('/workspace/planner/settings');
  }, [googleStatus, router]);

  const disconnectGoogle = async () => {
    setDisconnecting(true);
    const res = await disconnectGoogleAction();
    setDisconnecting(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Google disconnected');
      router.refresh();
    }
  };

  const timezones = useMemo(() => {
    try {
      // @ts-ignore
      const list = Intl.supportedValuesOf?.('timeZone') as string[] | undefined;
      if (list && list.length) return list;
    } catch {}
    return ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney'];
  }, []);

  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 1)); // Default: July 2026

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to generate monthly days grid (5 or 6 weeks)
  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of current month (Sunday is 0, Monday is 1, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();
    // Total days in previous month
    const prevTotalDays = new Date(year, month, 0).getDate();

    const grid = [];

    // Fill previous month padding days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevTotalDays - i;
      grid.push({
        day: d,
        isCurrentMonth: false,
        dateString: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayOfWeek: new Date(year, month - 1, d).getDay()
      });
    }

    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        dayOfWeek: new Date(year, month, i).getDay()
      });
    }

    // Fill next month padding days
    const totalCells = grid.length > 35 ? 42 : 35;
    let nextMonthDay = 1;
    while (grid.length < totalCells) {
      grid.push({
        day: nextMonthDay,
        isCurrentMonth: false,
        dateString: `${year}-${String(month + 2).padStart(2, '0')}-${String(nextMonthDay).padStart(2, '0')}`,
        dayOfWeek: new Date(year, month + 1, nextMonthDay).getDay()
      });
      nextMonthDay++;
    }

    return grid;
  }, [currentDate]);

  const toggleDay = (d: number) => {
    setS((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(d)
        ? prev.workingDays.filter((x) => x !== d)
        : [...prev.workingDays, d].sort((a, b) => a - b),
    }));
  };

  const copyHoursToAll = (sourceDayIndex: number) => {
    // Copy working hours to all active working days
    toast.success(`Working hours copied to all days.`);
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    if (s.blockedDates.includes(newBlockedDate)) return;
    setS((prev) => ({ ...prev, blockedDates: [...prev.blockedDates, newBlockedDate].sort() }));
    setNewBlockedDate('');
    setIsAddingBlockedDate(false);
  };

  const save = async (isAuto = false) => {
    if (s.workingHoursEnd <= s.workingHoursStart) {
      if (!isAuto) toast.error('Working hours end must be after start.');
      return;
    }
    if (s.workingDays.length === 0) {
      if (!isAuto) toast.error('Select at least one working day.');
      return;
    }
    setSaving(true);
    const res = await updateAvailabilitySettingsAction(s);
    setSaving(false);
    if (res.error) {
      if (!isAuto) toast.error(res.error);
    } else {
      if (!isAuto) toast.success('Availability updated');
      router.refresh();
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      save(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [s]);

  const generalBookingUrl = `${appUrl || ''}/book?org=${encodeURIComponent(orgParam)}`;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header & Tabs */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          Availability
        </h1>
        <div className="flex items-center gap-8 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('schedules')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'schedules'
                ? 'border-blue-600 text-[#092540] dark:border-blue-400 dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Schedules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'calendar'
                ? 'border-blue-600 text-[#092540] dark:border-blue-400 dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Calendar settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === 'advanced'
                ? 'border-blue-600 text-[#092540] dark:border-blue-400 dark:text-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Advanced settings
          </button>
        </div>
      </div>

      {/* TAB 1: Schedules */}
      {activeTab === 'schedules' && (
        <div className="bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Schedule Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                Schedule
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedSchedule}
                  onChange={(e) => setSelectedSchedule(e.target.value)}
                  className="text-lg font-bold text-[#092540] dark:text-white bg-transparent border-none outline-none cursor-pointer p-0 pr-2 focus:ring-0"
                >
                  <option value="working-hours">Working hours (default)</option>
                  <option value="custom">Custom Schedule</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] font-bold">!</span>
                <span>Active on:</span>
                <button type="button" className="font-semibold text-slate-700 dark:text-slate-300 hover:underline flex items-center gap-1">
                  0 event types <ChevronDown size={12} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Toggle List / Calendar */}
              <div className="inline-flex items-center bg-[#ebeff3] dark:bg-[#20242b] border border-[#d0d7de] dark:border-white/10 rounded-[10px] p-[3px]">
                <button
                  type="button"
                  onClick={() => setSchedulesViewMode('list')}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-[7px] text-xs transition-all ${
                    schedulesViewMode === 'list'
                      ? 'bg-white dark:bg-[#2c313a] text-[#092540] dark:text-white font-bold border border-[#d0d7de]/50 shadow-sm'
                      : 'text-[#4c6680] dark:text-slate-400 font-semibold hover:text-[#092540]'
                  }`}
                >
                  <List size={14} /> List
                </button>
                <button
                  type="button"
                  onClick={() => setSchedulesViewMode('calendar')}
                  className={`flex items-center gap-1.5 px-3.5 py-1 rounded-[7px] text-xs transition-all ${
                    schedulesViewMode === 'calendar'
                      ? 'bg-white dark:bg-[#2c313a] text-[#092540] dark:text-white font-bold border border-[#d0d7de]/50 shadow-sm'
                      : 'text-[#4c6680] dark:text-slate-400 font-semibold hover:text-[#092540]'
                  }`}
                >
                  <Calendar size={14} /> Calendar
                </button>
              </div>

              <button type="button" className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg border border-slate-200 dark:border-white/10">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-white/10 pt-4"></div>

          {schedulesViewMode === 'list' ? (
            <div className="space-y-6">
              {/* Left Column: Weekly hours */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <RotateCw size={16} className="text-slate-500" /> Weekly hours
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Set when you are typically available for meetings
                  </p>
                </div>

                {/* Days List */}
                <div className="space-y-3">
                  {DAY_LABELS.map((dayName, dayIndex) => {
                    const isAvailable = s.workingDays.includes(dayIndex);
                    return (
                      <div key={dayIndex} className="flex items-center gap-3 text-sm py-1">
                        {/* Day circle icon */}
                        <span className="w-7 h-7 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center justify-center shrink-0">
                          {DAY_SHORT_CODES[dayIndex]}
                        </span>

                        {isAvailable ? (
                          <div className="flex items-center gap-2 flex-1 flex-wrap">
                            <input
                              type="time"
                              value={minutesToHHMM(s.workingHoursStart)}
                              onChange={(e) => setS((p) => ({ ...p, workingHoursStart: hhmmToMinutes(e.target.value) }))}
                              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-slate-200 outline-none font-medium focus:border-slate-400"
                            />
                            <span className="text-slate-400 text-xs">-</span>
                            <input
                              type="time"
                              value={minutesToHHMM(s.workingHoursEnd)}
                              onChange={(e) => setS((p) => ({ ...p, workingHoursEnd: hhmmToMinutes(e.target.value) }))}
                              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-slate-200 outline-none font-medium focus:border-slate-400"
                            />
                            <button
                              type="button"
                              onClick={() => toggleDay(dayIndex)}
                              title="Mark Unavailable"
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                              <X size={15} />
                            </button>
                            <button
                              type="button"
                              title="Add interval"
                              className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                              <Plus size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyHoursToAll(dayIndex)}
                              title="Copy to all working days"
                              className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                              <Copy size={15} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">Unavailable</span>
                            <button
                              type="button"
                              onClick={() => toggleDay(dayIndex)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Timezone picker link */}
                <div className="pt-2">
                  <select
                    value={s.timezone}
                    onChange={(e) => setS((p) => ({ ...p, timezone: e.target.value }))}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-transparent border-none outline-none cursor-pointer p-0 hover:underline"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            ) : (
              <div className="space-y-4">
                {/* Calendar Month Selector & Timezone Header */}
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-base font-bold text-slate-800 dark:text-white min-w-[100px] text-center">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
                
                {/* Timezone link on right */}
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {s.timezone}
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-900/50 border-t border-l border-r border-slate-200 dark:border-white/10 rounded-t-xl text-center py-3 text-[10px] font-bold text-slate-500 tracking-wider">
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* Days Grid Cells */}
              <div className="grid grid-cols-7 border-r border-b border-slate-200 dark:border-white/10 rounded-b-xl overflow-hidden bg-white dark:bg-[#1a1a1e]">
                {calendarGrid.map((cell, idx) => {
                  const isWorkingDay = s.workingDays.includes(cell.dayOfWeek);
                  const isBlocked = s.blockedDates.includes(cell.dateString);
                  const showHours = isWorkingDay && !isBlocked;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[105px] p-3 flex flex-col justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors border-t border-l border-slate-200 dark:border-white/10 relative ${
                        !cell.isCurrentMonth ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Day Cell Header */}
                      <div className="flex items-start justify-between">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {cell.day}
                        </span>
                        <RotateCw size={11} className="text-slate-300 hover:text-slate-500 cursor-pointer transition-colors" />
                      </div>

                      {/* Available Hours */}
                      <div className="mt-4 text-center">
                        {showHours ? (
                          <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                            {minutesTo12H(s.workingHoursStart)} – {minutesTo12H(s.workingHoursEnd)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Save Action */}
          <div className="pt-6 border-t border-slate-200 dark:border-white/10 flex justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium select-none">
              {saving ? (
                <>
                  <Clock className="animate-spin text-blue-500" size={13} />
                  <span>Saving changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-emerald-500" size={13} />
                  <span>All changes saved automatically</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Calendar Settings */}
      {activeTab === 'calendar' && (
        <div className="bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-8">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Calendar settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Set which calendars we use to check for busy times
            </p>
          </div>

          {/* Section 1: Calendars to check for conflicts */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Calendars to check for conflicts
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  These calendars will be used to prevent double bookings
                </p>
              </div>
              <a
                href="/api/integrations/google/connect"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-slate-300 dark:border-white/20 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
              >
                <Plus size={13} /> Connect calendar account
              </a>
            </div>

            {/* Connected Account Card */}
            {googleConnectedEmail ? (
              <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div className="flex items-center gap-3.5">
                  <GoogleCalendar31Icon />
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Google Calendar
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {googleConnectedEmail}
                    </div>
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 cursor-pointer hover:underline mt-0.5">
                      Checking 1 calendar
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={disconnectGoogle}
                  disabled={disconnecting}
                  title="Remove calendar connection"
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-6 text-center space-y-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  No calendar connected. Connect your Google Calendar to avoid scheduling conflicts.
                </div>
                <a
                  href="/api/integrations/google/connect"
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-semibold"
                >
                  Connect Google Calendar
                </a>
              </div>
            )}
          </div>

          {/* Section 2: Calendar to add events to */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Calendar to add events to
            </h3>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-4 flex items-center justify-between bg-white dark:bg-[#1a1a1e] cursor-pointer hover:border-slate-300">
              <div className="flex items-center gap-3.5">
                <GoogleCalendar31Icon />
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {googleConnectedEmail || 'Google Calendar'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {googleConnectedEmail || 'No account connected'}
                  </div>
                </div>
              </div>
              <ChevronDown size={18} className="text-slate-400" />
            </div>
          </div>

          {/* Section 3: Sync settings */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sync settings
            </h3>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBuffers}
                  onChange={(e) => setIncludeBuffers(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Include buffers on this calendar</span>
                <Info size={13} className="text-slate-400" />
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Automatically sync changes from this calendar to Calendly</span>
                <Info size={13} className="text-slate-400" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Advanced Settings */}
      {activeTab === 'advanced' && (
        <div className="bg-white dark:bg-[#1a1a1e] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Advanced settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure booking link, slot duration, and default intro-call host
            </p>
          </div>

          {/* General booking link */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Link2 size={14} /> General intro-call booking link
            </label>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={generalBookingUrl}
                className="flex-1 h-9 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 text-xs text-slate-700 dark:text-slate-300 outline-none"
              />
              <button
                type="button"
                onClick={() => { navigator.clipboard?.writeText(generalBookingUrl); toast.success('Copied'); }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          </div>

          {/* Slot duration */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Clock size={14} /> Slot duration
            </label>
            <select
              value={s.slotDurationMinutes}
              onChange={(e) => setS((p) => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
              className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] dark:text-white px-3 text-xs outline-none"
            >
              {SLOT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o} minutes</option>
              ))}
            </select>
          </div>

          {/* Default intro call host */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Users size={14} /> Default intro-call host
            </label>
            <select
              value={s.defaultIntroCallAttendeeId || ''}
              onChange={(e) => setS((p) => ({ ...p, defaultIntroCallAttendeeId: e.target.value || null }))}
              className="h-9 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] dark:text-white px-3 text-xs outline-none"
            >
              {hosts.map((h) => (
                <option key={h.id} value={h.id}>{h.name} ({h.role.toLowerCase()})</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium select-none">
              {saving ? (
                <>
                  <Clock className="animate-spin text-blue-500" size={13} />
                  <span>Saving changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="text-emerald-500" size={13} />
                  <span>All changes saved automatically</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
