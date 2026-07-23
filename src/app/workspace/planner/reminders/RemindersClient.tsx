'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckSquare,
  Video,
  Check,
  Clock,
  AlarmClockOff,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronDown,
  RotateCcw,
  Sparkles,
  AlertCircle,
  X,
} from 'lucide-react';
import { format, isToday, isTomorrow, isThisWeek, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Reminder = {
  id: string;
  kind: 'task' | 'meeting';
  title: string;
  date: string;
  meta: string | null;
  href: string | null;
};

const DISMISS_KEY = 'omniwork_reminders_dismissed'; // { [id]: timestamp (until) | 'done' }
const CUSTOM_REMINDERS_KEY = 'omniwork_custom_reminders';

function loadState(): Record<string, number | 'done'> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
  } catch {
    return {};
  }
}

function loadCustomReminders(): Reminder[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_REMINDERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function relativeDateLabel(dateIso: string) {
  const date = parseISO(dateIso);
  const timeStr = format(date, 'h:mm a');
  if (isToday(date)) return `Today at ${timeStr}`;
  if (isTomorrow(date)) return `Tomorrow at ${timeStr}`;
  if (isThisWeek(date)) return `${format(date, 'EEEE')} at ${timeStr}`;
  return `${format(date, 'MMM d, yyyy')} at ${timeStr}`;
}

type TabFilter = 'all' | 'meetings' | 'tasks' | 'today' | 'snoozed' | 'completed';

export default function RemindersClient({ reminders: serverReminders }: { reminders: Reminder[] }) {
  const [state, setState] = useState<Record<string, number | 'done'>>({});
  const [customReminders, setCustomReminders] = useState<Reminder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const [newKind, setNewKind] = useState<'task' | 'meeting'>('task');

  useEffect(() => {
    setState(loadState());
    setCustomReminders(loadCustomReminders());
  }, []);

  const allReminders = useMemo(() => {
    const combined = [...serverReminders, ...customReminders];
    return combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [serverReminders, customReminders]);

  const persistState = (next: Record<string, number | 'done'>) => {
    setState(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  const markDone = (id: string) => {
    persistState({ ...state, [id]: 'done' });
  };

  const snooze = (id: string, hours: number) => {
    const until = Date.now() + hours * 60 * 60 * 1000;
    persistState({ ...state, [id]: until });
  };

  const resetAllDismissed = () => {
    persistState({});
  };

  const addCustomReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const dateIso = new Date(`${newDate}T${newTime}:00`).toISOString();
    const newRem: Reminder = {
      id: `custom-${Date.now()}`,
      kind: newKind,
      title: newTitle.trim(),
      date: dateIso,
      meta: 'Personal Reminder',
      href: null,
    };

    const updated = [newRem, ...customReminders];
    setCustomReminders(updated);
    localStorage.setItem(CUSTOM_REMINDERS_KEY, JSON.stringify(updated));

    setNewTitle('');
    setNewDate('');
    setIsModalOpen(false);
  };

  // Status counts
  const counts = useMemo(() => {
    const now = Date.now();
    let totalActive = 0;
    let meetingsCount = 0;
    let tasksCount = 0;
    let todayCount = 0;
    let snoozedCount = 0;
    let completedCount = 0;

    allReminders.forEach(r => {
      const s = state[r.id];
      const isDone = s === 'done';
      const isSnoozed = typeof s === 'number' && s > now;

      if (isDone) {
        completedCount++;
      } else if (isSnoozed) {
        snoozedCount++;
      } else {
        totalActive++;
        if (r.kind === 'meeting') meetingsCount++;
        if (r.kind === 'task') tasksCount++;
        if (isToday(parseISO(r.date))) todayCount++;
      }
    });

    return { totalActive, meetingsCount, tasksCount, todayCount, snoozedCount, completedCount };
  }, [allReminders, state]);

  // Filtered list
  const filteredReminders = useMemo(() => {
    const now = Date.now();

    return allReminders.filter(r => {
      const s = state[r.id];
      const isDone = s === 'done';
      const isSnoozed = typeof s === 'number' && s > now;

      // Tab filtering
      if (activeTab === 'completed') {
        if (!isDone) return false;
      } else if (activeTab === 'snoozed') {
        if (!isSnoozed) return false;
      } else {
        // Active views
        if (isDone || isSnoozed) return false;
        if (activeTab === 'meetings' && r.kind !== 'meeting') return false;
        if (activeTab === 'tasks' && r.kind !== 'task') return false;
        if (activeTab === 'today' && !isToday(parseISO(r.date))) return false;
      }

      // Search filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesMeta = r.meta?.toLowerCase().includes(q) || false;
        if (!matchesTitle && !matchesMeta) return false;
      }

      return true;
    });
  }, [allReminders, state, activeTab, searchQuery]);

  return (
    <div className="w-full flex flex-col h-full bg-[#f8f9fa] dark:bg-[#111] -m-4 sm:-m-6 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] flex items-center justify-between flex-wrap gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bell size={22} className="text-slate-700 dark:text-slate-300" />
            Reminders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upcoming deadlines, scheduled meetings, and custom alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(counts.snoozedCount > 0 || counts.completedCount > 0) && (
            <button
              onClick={resetAllDismissed}
              className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
            >
              <RotateCcw size={14} />
              Reset Dismissed ({counts.snoozedCount + counts.completedCount})
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Plus size={15} />
            Quick Reminder
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Active</span>
              <Bell size={16} className="text-slate-400" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {counts.totalActive}
            </div>
          </div>

          <div className="p-4 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Due Today</span>
              <AlertCircle size={16} className="text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {counts.todayCount}
            </div>
          </div>

          <div className="p-4 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Meetings</span>
              <Video size={16} className="text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {counts.meetingsCount}
            </div>
          </div>

          <div className="p-4 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tasks</span>
              <CheckSquare size={16} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
              {counts.tasksCount}
            </div>
          </div>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-1 border-b border-slate-200 dark:border-white/10">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('all')}
              className={`h-8 px-3 rounded-[8px] text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              All ({counts.totalActive})
            </button>

            <button
              onClick={() => setActiveTab('today')}
              className={`h-8 px-3 rounded-[8px] text-xs font-semibold transition-colors ${
                activeTab === 'today'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              Due Today ({counts.todayCount})
            </button>

            <button
              onClick={() => setActiveTab('meetings')}
              className={`h-8 px-3 rounded-[8px] text-xs font-semibold transition-colors ${
                activeTab === 'meetings'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              Meetings ({counts.meetingsCount})
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`h-8 px-3 rounded-[8px] text-xs font-semibold transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              Tasks ({counts.tasksCount})
            </button>

            <button
              onClick={() => setActiveTab('snoozed')}
              className={`h-8 px-3 rounded-[8px] text-xs font-semibold transition-colors ${
                activeTab === 'snoozed'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              Snoozed ({counts.snoozedCount})
            </button>

            <button
              onClick={() => setActiveTab('completed')}
              className={`h-8 px-3 rounded-[8px] text-xs font-semibold transition-colors ${
                activeTab === 'completed'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
              }`}
            >
              Completed ({counts.completedCount})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search reminders..."
              className="w-full h-8 pl-9 pr-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400"
            />
          </div>
        </div>

        {/* Reminders List */}
        {filteredReminders.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-[8px] bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">All caught up!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {activeTab === 'completed'
                ? 'No completed reminders yet.'
                : activeTab === 'snoozed'
                ? 'No snoozed reminders.'
                : 'No active reminders match your filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReminders.map(r => {
              const isDone = state[r.id] === 'done';
              const isMeeting = r.kind === 'meeting';
              const dateObj = parseISO(r.date);
              const isUrgent = isToday(dateObj) && !isDone;

              return (
                <div
                  key={r.id}
                  className={`group flex items-center gap-4 rounded-[8px] border p-4 transition-all ${
                    isDone
                      ? 'border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] opacity-75'
                      : isUrgent
                      ? 'border-amber-300 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] hover:border-slate-300'
                  }`}
                >
                  {/* Icon Badge */}
                  <div
                    className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 ${
                      isMeeting
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                        : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    }`}
                  >
                    {isMeeting ? <Video size={18} /> : <CheckSquare size={18} />}
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {r.href ? (
                        <Link
                          href={r.href}
                          className={`text-sm font-bold text-slate-900 dark:text-white hover:underline truncate ${
                            isDone ? 'line-through text-slate-500' : ''
                          }`}
                        >
                          {r.title}
                        </Link>
                      ) : (
                        <span
                          className={`text-sm font-bold text-slate-900 dark:text-white truncate ${
                            isDone ? 'line-through text-slate-500' : ''
                          }`}
                        >
                          {r.title}
                        </span>
                      )}

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-[4px] uppercase tracking-wider ${
                          isMeeting
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                        }`}
                      >
                        {r.kind}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium">
                        <Clock size={12} className="text-slate-400" />
                        {relativeDateLabel(r.date)}
                      </span>

                      {r.meta && (
                        <span className="text-slate-400 dark:text-slate-500">
                          • {r.meta}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {r.href && (
                      <Link
                        href={r.href}
                        className="p-2 rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                        title="View details"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    )}

                    {!isDone && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-2 rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                            title="Snooze"
                          >
                            <AlarmClockOff size={15} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-[8px]">
                          <DropdownMenuItem onClick={() => snooze(r.id, 1)} className="text-xs cursor-pointer">
                            Snooze 1 hour
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => snooze(r.id, 4)} className="text-xs cursor-pointer">
                            Snooze 4 hours
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => snooze(r.id, 24)} className="text-xs cursor-pointer">
                            Snooze 1 day
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => snooze(r.id, 72)} className="text-xs cursor-pointer">
                            Snooze 3 days
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    <button
                      type="button"
                      onClick={() => markDone(r.id)}
                      title={isDone ? 'Mark as active' : 'Mark done'}
                      className={`flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-xs font-bold transition-colors ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-emerald-500 hover:text-white'
                      }`}
                    >
                      <Check size={14} />
                      {isDone ? 'Done' : 'Complete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Reminder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[8px] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell size={18} /> New Quick Reminder
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={addCustomReminder} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Review salary details..."
                  className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Type</label>
                  <select
                    value={newKind}
                    onChange={e => setNewKind(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none"
                  >
                    <option value="task">Task Alert</option>
                    <option value="meeting">Meeting Alert</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Time</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Date</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 rounded-[8px] text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100"
                >
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
