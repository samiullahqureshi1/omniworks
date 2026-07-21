'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Filter, ChevronDown, Download, Settings,
  Video, Sparkles, Loader2, ExternalLink, ListChecks,
  FileText, Plus, Clock, Check, X, Calendar,
} from 'lucide-react';
import { format, isToday, isSameDay, startOfDay } from 'date-fns';
import { analyzeMeetingAction, createTaskFromActionItemAction } from '@/app/actions/meetingNotes';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionItem = { text: string; assignee_guess: string | null; due_date_guess: string | null };

type Meeting = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  meetLink?: string | null;
  leadName?: string | null;
  leadEmail?: string | null;
  leadCompany?: string | null;
  project?: { id: string; name: string } | null;
  pm?: { id: string; name: string } | null;
  note?: any;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return format(new Date(iso), 'h:mm aa').replace(':00', '').toLowerCase();
}

function fmtDayHeader(date: Date) {
  const day = format(date, 'EEE'); // Mon
  const num = format(date, 'd');   // 8
  const mon = format(date, 'MMM'); // Jun
  return { day, num, mon };
}

function getMeetingTitle(m: Meeting) {
  if (m.project) return `Meeting — ${m.project.name}`;
  return '15-Minute Intro Call';
}

function getMeetingWith(m: Meeting) {
  if (m.leadName) return m.leadName;
  if (m.pm?.name) return m.pm.name;
  return '';
}

// Dot color by status
const DOT_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-400',
  COMPLETED: 'bg-emerald-400',
  CANCELLED: 'bg-slate-300',
  NO_SHOW: 'bg-amber-400',
};

// ─── Single meeting row ───────────────────────────────────────────────────────

function MeetingRow({ meeting, canManage }: { meeting: Meeting; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [note, setNote] = useState<any>(meeting.note);

  const actionItems: ActionItem[] = Array.isArray(note?.actionItems) ? note.actionItems : [];
  const keyPoints: string[] = Array.isArray(note?.keyPoints) ? note.keyPoints : [];

  const startT = fmtTime(meeting.startTime);
  const endT   = fmtTime(meeting.endTime);
  const withName = getMeetingWith(meeting);
  const title = getMeetingTitle(meeting);
  const dot = DOT_COLOR[meeting.status] ?? DOT_COLOR.SCHEDULED;

  const generate = async () => {
    setBusy(true);
    const res = await analyzeMeetingAction({ meetingId: meeting.id, transcriptText: transcript.trim() || undefined });
    setBusy(false);
    if (res.error) toast.error(res.error);
    else { setNote(res.note); setTranscript(''); toast.success('Notes generated'); }
  };

  const convert = async (item: ActionItem) => {
    const res = await createTaskFromActionItemAction({ meetingId: meeting.id, text: item.text, dueDateGuess: item.due_date_guess });
    if (res.error) toast.error(res.error);
    else { toast.success('Task created'); router.refresh(); }
  };

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a1a] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
      >
        {/* Time range */}
        <span className="text-[13px] text-slate-500 dark:text-slate-400 w-28 shrink-0 tabular-nums">
          {startT} – {endT}
        </span>

        {/* Status dot */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />

        {/* Title + with */}
        <span className="min-w-0 flex-1 text-[14px] font-bold text-slate-900 dark:text-white truncate">
          {title}
          {withName && (
            <span className="font-normal text-slate-500 dark:text-slate-400 ml-1.5">
              with {withName}
            </span>
          )}
        </span>

        {/* Meet link shortcut */}
        {meeting.meetLink && (
          <a
            href={meeting.meetLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="shrink-0 flex items-center gap-1 text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Video size={13} /> Join
          </a>
        )}
      </button>

      {/* Expanded details */}
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/5 pt-4 space-y-4">
          {meeting.meetLink && (
            <a
              href={meeting.meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90"
            >
              <Video size={15} /> Join Google Meet <ExternalLink size={13} />
            </a>
          )}

          {note?.summary ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1.5"><Sparkles size={12} /> Summary</div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{note.summary}</p>
              </div>
              {keyPoints.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1">Key points</div>
                  <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
                    {keyPoints.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              )}
              {actionItems.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1.5"><ListChecks size={12} /> Action items</div>
                  <div className="flex flex-col gap-1.5">
                    {actionItems.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-slate-800 dark:text-slate-200 truncate">{a.text}</div>
                          {(a.assignee_guess || a.due_date_guess) && (
                            <div className="text-[11px] text-slate-400">
                              {a.assignee_guess && <span>{a.assignee_guess}</span>}
                              {a.assignee_guess && a.due_date_guess && ' · '}
                              {a.due_date_guess && <span>{a.due_date_guess}</span>}
                            </div>
                          )}
                        </div>
                        {canManage && meeting.project && (
                          <button type="button" onClick={() => convert(a)}
                            className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
                            <Plus size={12} /> Task
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-4 text-center">
              <FileText className="h-5 w-5 text-slate-300 dark:text-slate-600 mx-auto mb-1" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No notes yet</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {canManage ? 'Generate notes automatically, or paste a transcript below.' : 'The meeting host can generate notes.'}
              </p>
            </div>
          )}

          {canManage && (
            <div className="space-y-2">
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={3}
                placeholder="Paste a transcript or notes to analyze with AI (optional)…"
                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-400 resize-none"
              />
              <button type="button" onClick={generate} disabled={busy}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {note?.summary ? 'Regenerate notes' : 'Generate AI notes'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MeetingsClient({ meetings, role }: { meetings: Meeting[]; role: string }) {
  const canManage = role !== 'CLIENT';

  // State
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'upcoming' | 'past' | 'all'>('all');
  const [showAll, setShowAll] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterPanel(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const now = new Date();

  // Apply search + status filter
  const filtered = useMemo(() => {
    let list = [...meetings];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        getMeetingTitle(m).toLowerCase().includes(q) ||
        (getMeetingWith(m) || '').toLowerCase().includes(q) ||
        (m.leadEmail || '').toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      list = list.filter(m => m.status === filterStatus);
    }

    return list;
  }, [meetings, search, filterStatus]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, { date: Date; meetings: Meeting[] }>();
    const sorted = [...filtered].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (const m of sorted) {
      const d = startOfDay(new Date(m.startTime));
      const key = d.toISOString();
      if (!map.has(key)) map.set(key, { date: d, meetings: [] });
      map.get(key)!.meetings.push(m);
    }
    return Array.from(map.values());
  }, [filtered]);

  const displayedGroups = showAll ? grouped : grouped.slice(0, 5);
  const hasMore = grouped.length > 5 && !showAll;

  const STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'SCHEDULED', label: 'Scheduled' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
    { value: 'NO_SHOW', label: 'No Show' },
  ];

  return (
    <div className="w-full flex flex-col h-full bg-[#f8f9fa] dark:bg-[#111] -m-4 sm:-m-6 overflow-hidden">

      {/* Page header */}
      <div className="px-6 pt-5 pb-0">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meetings</h1>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 flex-wrap border-b border-slate-200 dark:border-white/10">

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings"
            className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-[#0875f5] placeholder:text-slate-400"
          />
        </div>

        {/* Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            className={`flex items-center gap-2 h-9 px-3 rounded-[8px] border text-sm font-medium transition-colors ${
              showFilterPanel || filterStatus !== 'all'
                ? 'border-[#0875f5] text-[#0875f5] bg-blue-50 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={15} />
            Filter
            {filterStatus !== 'all' && (
              <span className="bg-[#0875f5] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">1</span>
            )}
            <ChevronDown size={14} />
          </button>
          {showFilterPanel && (
            <div className="absolute left-0 top-11 z-50 w-52 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5">Status</p>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterStatus(opt.value); setShowFilterPanel(false); }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-300"
                >
                  {opt.label}
                  {filterStatus === opt.value && <Check size={14} className="text-[#0875f5]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export */}
        <button className="flex items-center gap-1.5 text-sm font-semibold text-[#0875f5] hover:underline">
          <Download size={15} />
          Export meetings
        </button>

        {/* Settings */}
        <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
          <Settings size={15} />
          Settings
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-1 custom-scrollbar">

        {/* Active filter pill */}
        {filterStatus !== 'all' && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-full bg-blue-50 dark:bg-blue-950/30 text-[#0875f5] text-[12px] font-medium border border-blue-200 dark:border-blue-900/50">
              Status: {filterStatus}
              <button onClick={() => setFilterStatus('all')} className="hover:opacity-70"><X size={12} /></button>
            </span>
          </div>
        )}

        {/* View more button */}
        {!showAll && grouped.length > 0 && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setShowAll(true)}
              className="h-9 px-6 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              View more meetings
            </button>
          </div>
        )}

        {/* Date groups */}
        {displayedGroups.length === 0 ? (
          /* Empty state */
          <div>
            {/* Today header placeholder */}
            <div className="flex items-center gap-3 py-3">
              <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                {format(now, 'EEE')}{' '}
                <span className="text-[#0875f5]">{format(now, 'd MMM')}</span>
              </span>
              <span className="text-xs font-semibold text-[#0875f5] bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">Today</span>
            </div>
            {/* Blue timeline for today */}
            <div className="relative mb-1">
              <div className="h-[2px] bg-[#0875f5] w-full rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0875f5]" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0875f5]" />
            </div>

            <div className="border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-[#1a1a1a] py-12 px-6 text-center mt-2">
              {/* Calendar emoji-style icon */}
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4">
                <Calendar size={32} className="text-[#0875f5]" />
              </div>
              <p className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">No upcoming meetings</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                You don't appear to have any upcoming meetings. Schedule a meeting to keep the momentum going with your previous contacts.
              </p>
              <button className="mt-5 h-9 px-5 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                Schedule meeting
              </button>
            </div>
          </div>
        ) : (
          displayedGroups.map(({ date, meetings: dayMeetings }) => {
            const isTodayDate = isToday(date);
            const { day, num, mon } = fmtDayHeader(date);

            return (
              <div key={date.toISOString()} className="mb-2">
                {/* Date header */}
                <div className="flex items-center gap-3 py-3">
                  <span className="text-[15px] font-bold text-slate-900 dark:text-white">
                    {day}{' '}
                    <span className={isTodayDate ? 'text-[#0875f5]' : ''}>
                      {num} {mon}
                    </span>
                  </span>
                  {isTodayDate && (
                    <span className="text-xs font-semibold text-[#0875f5] bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>

                {/* Timeline line for today */}
                {isTodayDate && (
                  <div className="relative mb-2">
                    <div className="h-[2px] bg-[#0875f5] w-full rounded-full" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0875f5]" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0875f5]" />
                  </div>
                )}

                {/* Meeting rows */}
                <div className="space-y-2">
                  {dayMeetings.map(m => (
                    <MeetingRow key={m.id} meeting={m} canManage={canManage} />
                  ))}
                </div>
              </div>
            );
          })
        )}

        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={() => setShowAll(true)}
              className="h-9 px-6 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              View more meetings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
