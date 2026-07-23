'use client';

import React, { useState, useEffect, useMemo, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Sparkles, Plus, Pencil, Trash2, Flag, Milestone,
  Calendar as CalIcon, Repeat, RefreshCw, Search, Filter,
  ChevronDown, Check, X, Building2, UserCheck, Layers,
  Globe, Eye, Clock, CheckCircle2, User, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import {
  createPlannerEventAction, updatePlannerEventAction, deletePlannerEventAction,
  processRecurringEventsAction,
  type PlannerEventInput,
} from '@/app/actions/planner';

// ─── Types ────────────────────────────────────────────────────────────────────

type Ev = {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string | null;
  visibility: string;
  status: string;
  isRepeated?: boolean;
  repeatFrequency?: string | null;
  project?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
};

type ProjectOption = { id: string; name: string };
type MemberOption = { id: string; name: string; email?: string };

type EventTab = 'all' | 'milestones' | 'tasks' | 'meetings' | 'recurring';

const TYPE_META: Record<string, { label: string; icon: any; cls: string; badgeCls: string }> = {
  MILESTONE: {
    label: 'Milestone',
    icon: Milestone,
    cls: 'bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 border-violet-200 dark:border-violet-900/30',
    badgeCls: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800/40',
  },
  TASK: {
    label: 'Task',
    icon: Flag,
    cls: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/30',
    badgeCls: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/40',
  },
  MEETING: {
    label: 'Meeting',
    icon: CalIcon,
    cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30',
    badgeCls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
  },
};

const FREQ_LABELS: Record<string, string> = {
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  YEARLY: 'Yearly',
};

function fmtRange(start: string, end: string | null) {
  try {
    const s = format(new Date(start), 'MMM d, yyyy');
    if (!end) return s;
    const e = format(new Date(end), 'MMM d, yyyy');
    return `${s} – ${e}`;
  } catch {
    return start;
  }
}

const emptyForm: PlannerEventInput = {
  title: '',
  type: 'MILESTONE',
  startDate: '',
  endDate: '',
  projectId: '',
  assignedToId: '',
  visibility: 'INTERNAL',
  status: 'OPEN',
  isRepeated: false,
  repeatFrequency: null,
  repeatEndsAt: '',
};

// ─── Member Assignee Selector Popover ───────────────────────────────────────

function MemberAssigneeSelector({
  members,
  selectedId,
  onChange,
}: {
  members: MemberOption[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const q = search.toLowerCase();
    return members.filter(
      m => m.name.toLowerCase().includes(q) || (m.email && m.email.toLowerCase().includes(q))
    );
  }, [members, search]);

  const selectedMember = members.find(m => m.id === selectedId);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-left text-xs flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
      >
        {!selectedMember ? (
          <span className="text-slate-400 font-medium">Unassigned</span>
        ) : (
          <div className="flex items-center gap-2 truncate">
            <span className="w-5 h-5 rounded-full bg-[#52647a] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {selectedMember.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
            <span className="text-slate-900 dark:text-white font-bold truncate">
              {selectedMember.name}
            </span>
          </div>
        )}
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-72 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-[12px] shadow-2xl p-2.5 space-y-2">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full h-8 px-3 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400 placeholder:text-slate-400"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] text-left text-xs transition-colors ${
                !selectedId ? 'bg-slate-100 dark:bg-white/10 font-bold' : 'hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <span className="text-slate-500">Unassigned</span>
            </button>
            {filteredMembers.map(m => {
              const isSelected = selectedId === m.id;
              const initials = m.name
                ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : 'U';
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.id); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[8px] text-left transition-colors ${
                    isSelected ? 'bg-slate-100 dark:bg-white/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="w-7 h-7 rounded-full bg-[#52647a] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{m.name}</div>
                    {m.email && <div className="text-[11px] text-slate-400 truncate">{m.email}</div>}
                  </div>
                  {isSelected && <Check size={14} className="text-slate-900 dark:text-white shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EventsClient({
  events,
  canManage,
  projects = [],
  members = [],
}: {
  events: Ev[];
  canManage: boolean;
  projects: Array<{ id: string; name: string }>;
  members: Array<{ id: string; name: string; email?: string }>;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlannerEventInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters & Tabs
  const [currentTab, setCurrentTab] = useState<EventTab>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    processRecurringEventsAction().then(() => router.refresh());
  }, [router]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterPanel(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (e: Ev) => {
    setEditId(e.id);
    setForm({
      title: e.title,
      type: e.type as any,
      startDate: e.startDate.slice(0, 10),
      endDate: e.endDate ? e.endDate.slice(0, 10) : '',
      projectId: e.project?.id || '',
      assignedToId: e.assignedTo?.id || '',
      visibility: e.visibility as any,
      status: e.status,
      isRepeated: e.isRepeated || false,
      repeatFrequency: (e.repeatFrequency as any) || null,
      repeatEndsAt: '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.title.trim()) return toast.error('Please enter a title.');
    if (!form.startDate) return toast.error('Please pick a start date.');
    if (form.isRepeated && !form.repeatFrequency) return toast.error('Please pick a repeat frequency.');

    setSaving(true);
    const res = editId
      ? await updatePlannerEventAction(editId, form)
      : await createPlannerEventAction(form);
    setSaving(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success(editId ? 'Event updated successfully' : 'Event created successfully');
      setModalOpen(false);
      router.refresh();
    }
  };

  const remove = async (id: string) => {
    const res = await deletePlannerEventAction(id);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Event deleted');
      router.refresh();
    }
  };

  const manualRefresh = () => {
    startTransition(async () => {
      await processRecurringEventsAction();
      router.refresh();
      toast.success('Recurring events processed');
    });
  };

  // Counts for Top View Tabs
  const counts = useMemo(() => {
    let milestones = 0;
    let tasks = 0;
    let meetings = 0;
    let recurring = 0;

    events.forEach(e => {
      if (e.type === 'MILESTONE') milestones++;
      if (e.type === 'TASK') tasks++;
      if (e.type === 'MEETING') meetings++;
      if (e.isRepeated) recurring++;
    });

    return { milestones, tasks, meetings, recurring, total: events.length };
  }, [events]);

  // Filtered Events List
  const filteredEvents = useMemo(() => {
    let list = [...events];

    // Tab filter
    if (currentTab === 'milestones') list = list.filter(e => e.type === 'MILESTONE');
    else if (currentTab === 'tasks') list = list.filter(e => e.type === 'TASK');
    else if (currentTab === 'meetings') list = list.filter(e => e.type === 'MEETING');
    else if (currentTab === 'recurring') list = list.filter(e => e.isRepeated);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          (e.project?.name || '').toLowerCase().includes(q) ||
          (e.assignedTo?.name || '').toLowerCase().includes(q)
      );
    }

    // Type Filter
    if (typeFilter !== 'ALL') {
      list = list.filter(e => e.type === typeFilter);
    }

    // Visibility Filter
    if (visibilityFilter !== 'ALL') {
      list = list.filter(e => e.visibility === visibilityFilter);
    }

    return list;
  }, [events, currentTab, search, typeFilter, visibilityFilter]);

  return (
    <div className="w-full flex flex-col h-full bg-[#f8f9fa] dark:bg-[#111] -m-4 sm:-m-6 overflow-hidden">
      
      {/* Page Header */}
      <div className="px-6 pt-5 pb-0 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={20} className="text-slate-800 dark:text-white" /> Events & Milestones
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Organize org milestones, recurring schedules, and key project events.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={manualRefresh}
              disabled={isPending}
              title="Refresh recurring events"
              className="flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isPending ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Sync Recurring</span>
            </button>

            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <Plus size={15} />
              New Event
            </button>
          </div>
        )}
      </div>

      {/* Top Filter Tabs */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap border-b border-slate-200 dark:border-white/10 mt-2">
        <button
          onClick={() => setCurrentTab('all')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            currentTab === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          All Events ({counts.total})
        </button>

        <button
          onClick={() => setCurrentTab('milestones')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            currentTab === 'milestones'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Milestone size={14} />
          Milestones ({counts.milestones})
        </button>

        <button
          onClick={() => setCurrentTab('tasks')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            currentTab === 'tasks'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Flag size={14} />
          Tasks ({counts.tasks})
        </button>

        <button
          onClick={() => setCurrentTab('meetings')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            currentTab === 'meetings'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <CalIcon size={14} />
          Meetings ({counts.meetings})
        </button>

        <button
          onClick={() => setCurrentTab('recurring')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            currentTab === 'recurring'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Repeat size={14} />
          Recurring ({counts.recurring})
        </button>
      </div>

      {/* Toolbar (Search & Filter) */}
      <div className="px-6 py-3 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events by title, project, assignee..."
            className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 placeholder:text-slate-400"
          />
        </div>

        {/* Filter Dropdown */}
        <div className="relative" ref={filterRef}>
          <button
            type="button"
            onClick={() => setShowFilterPanel(v => !v)}
            className={`flex items-center gap-2 h-9 px-3 rounded-[8px] border text-xs font-medium transition-colors ${
              showFilterPanel || typeFilter !== 'ALL' || visibilityFilter !== 'ALL'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10'
                : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={14} />
            Filter
            {(typeFilter !== 'ALL' || visibilityFilter !== 'ALL') && (
              <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">!</span>
            )}
            <ChevronDown size={14} />
          </button>

          {showFilterPanel && (
            <div className="absolute left-0 top-11 z-50 w-60 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-[10px] shadow-2xl p-3 space-y-3">
              {/* Type Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Type</label>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="w-full h-8 px-2 rounded-[6px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-white outline-none"
                >
                  <option value="ALL">All Types</option>
                  <option value="MILESTONE">Milestone</option>
                  <option value="TASK">Task</option>
                  <option value="MEETING">Meeting</option>
                </select>
              </div>

              {/* Visibility Filter */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visibility</label>
                <select
                  value={visibilityFilter}
                  onChange={e => setVisibilityFilter(e.target.value)}
                  className="w-full h-8 px-2 rounded-[6px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-800 dark:text-white outline-none"
                >
                  <option value="ALL">All Visibility</option>
                  <option value="INTERNAL">Internal</option>
                  <option value="CLIENT_VISIBLE">Client-Visible</option>
                </select>
              </div>

              {(typeFilter !== 'ALL' || visibilityFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => { setTypeFilter('ALL'); setVisibilityFilter('ALL'); }}
                  className="w-full h-7 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline text-center block pt-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-2.5 custom-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="border border-slate-200 dark:border-white/10 rounded-[8px] bg-white dark:bg-[#1a1a1a] py-16 px-6 text-center mt-2">
            <div className="w-14 h-14 rounded-[8px] bg-slate-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-3">
              <Milestone size={28} className="text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white mb-1">No events found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {canManage ? 'Create a new milestone or event to populate your planner timeline.' : 'Shared org events will show up here.'}
            </p>
            {canManage && (
              <button
                type="button"
                onClick={openNew}
                className="mt-4 h-9 px-4 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Create Event
              </button>
            )}
          </div>
        ) : (
          filteredEvents.map(e => {
            const meta = TYPE_META[e.type] || TYPE_META.MILESTONE;
            const Icon = meta.icon;
            const initials = e.assignedTo?.name
              ? e.assignedTo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              : 'U';
            const isCompleted = e.status === 'COMPLETED' || e.status === 'DONE';

            return (
              <div
                key={e.id}
                className="group flex items-center justify-between gap-4 p-4 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  {/* Type Icon Badge */}
                  <div className={`w-10 h-10 rounded-[8px] border flex items-center justify-center shrink-0 ${meta.cls}`}>
                    <Icon size={18} />
                  </div>

                  {/* Title & Metadata */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {e.title}
                      </span>

                      {/* Type Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeCls}`}>
                        {meta.label}
                      </span>

                      {/* Status Completed Badge */}
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30">
                          <CheckCircle2 size={10} /> Completed
                        </span>
                      )}

                      {/* Repeat Badge */}
                      {e.isRepeated && e.repeatFrequency && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/30">
                          <Repeat size={10} /> {FREQ_LABELS[e.repeatFrequency]}
                        </span>
                      )}

                      {/* Client-visible Badge */}
                      {e.visibility === 'CLIENT_VISIBLE' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/30">
                          <Globe size={10} /> Client-visible
                        </span>
                      )}
                    </div>

                    {/* Date range & Project */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap font-medium">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {fmtRange(e.startDate, e.endDate)}
                      </span>

                      {e.project && (
                        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                          <Building2 size={12} /> {e.project.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Actions & Assignee */}
                <div className="flex items-center gap-3 shrink-0">
                  {/* Assignee Avatar */}
                  {e.assignedTo ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span className="w-5 h-5 rounded-full bg-[#52647a] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {initials}
                      </span>
                      <span className="truncate max-w-[100px]">{e.assignedTo.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium italic hidden sm:inline">Unassigned</span>
                  )}

                  {/* Actions */}
                  {canManage && (
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-white/10 pl-3">
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="Edit Event"
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(e.id)}
                        className="p-1.5 rounded-[6px] text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete Event"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal (Property Grid Format with Fixed Header/Footer) */}
      {modalOpen && canManage && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[12px] w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white dark:bg-[#1a1a1a]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Milestone size={18} /> {editId ? 'Edit Event' : 'Create Event'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set milestones, assign projects, and configure recurring rules.
                </p>
              </div>

              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
              
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Q3 Product Roadmap Launch"
                  className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-slate-400"
                />
              </div>

              {/* Property Grid (2-Column) */}
              <div className="grid grid-cols-2 gap-3.5">

                {/* Event Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Layers size={13} /> Type *
                  </label>
                  <select
                    value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value as any })}
                    className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-slate-400"
                  >
                    <option value="MILESTONE">Milestone</option>
                    <option value="TASK">Task</option>
                    <option value="MEETING">Meeting</option>
                  </select>
                </div>

                {/* Visibility */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Globe size={13} /> Visibility
                  </label>
                  <select
                    value={form.visibility}
                    onChange={e => setForm({ ...form, visibility: e.target.value as any })}
                    className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-slate-400"
                  >
                    <option value="INTERNAL">Internal</option>
                    <option value="CLIENT_VISIBLE">Client-Visible</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CalIcon size={13} /> Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CalIcon size={13} /> End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.endDate || ''}
                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                  />
                </div>

                {/* Associated Project */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Building2 size={13} /> Project (Optional)
                  </label>
                  <select
                    value={form.projectId || ''}
                    onChange={e => setForm({ ...form, projectId: e.target.value })}
                    className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                  >
                    <option value="">None</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee Popover */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <UserCheck size={13} /> Assignee (Optional)
                  </label>
                  <MemberAssigneeSelector
                    members={members}
                    selectedId={form.assignedToId || ''}
                    onChange={id => setForm({ ...form, assignedToId: id })}
                  />
                </div>
              </div>

              {/* Recurring Settings Container */}
              <div className="p-3.5 rounded-[8px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 space-y-3">
                <label className="flex items-center justify-between cursor-pointer select-none">
                  <div className="flex items-center gap-2">
                    <Repeat size={15} className="text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Repeat this Event
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        isRepeated: !form.isRepeated,
                        repeatFrequency: !form.isRepeated ? 'MONTHLY' : null,
                      })
                    }
                    className={`relative w-9 h-5 rounded-full transition-colors ${
                      form.isRepeated ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-white/20'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        form.isRepeated ? 'translate-x-4' : ''
                      }`}
                    />
                  </button>
                </label>

                {form.isRepeated && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Frequency</label>
                      <select
                        value={form.repeatFrequency || 'MONTHLY'}
                        onChange={e => setForm({ ...form, repeatFrequency: e.target.value as any })}
                        className="w-full h-8 px-2 rounded-[6px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="YEARLY">Yearly</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Ends On (Optional)</label>
                      <input
                        type="date"
                        value={form.repeatEndsAt || ''}
                        onChange={e => setForm({ ...form, repeatEndsAt: e.target.value })}
                        className="w-full h-8 px-2 rounded-[6px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3 shrink-0 bg-white dark:bg-[#1a1a1a]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 px-4 rounded-[8px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="h-9 px-5 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  editId ? 'Save Event' : 'Create Event'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
