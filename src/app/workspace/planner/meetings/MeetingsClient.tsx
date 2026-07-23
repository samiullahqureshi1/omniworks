'use client';

import React, { useMemo, useState, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Filter, ChevronDown, Video, Sparkles, Loader2,
  ExternalLink, ListChecks, FileText, Plus, Clock, Check,
  X, Calendar as CalIcon, UserCheck, Building2, ArrowRight,
  ArrowLeft, Users, CheckCircle2, Copy, Trash2, CalendarDays,
  MoreHorizontal, RefreshCw, AlertCircle, MessageSquare,
} from 'lucide-react';
import { format, isToday, isSameDay, startOfDay } from 'date-fns';
import { analyzeMeetingAction, createTaskFromActionItemAction } from '@/app/actions/meetingNotes';
import {
  createScheduledMeetingAction,
  rescheduleMeetingAction,
  postponeMeetingAction,
  completeMeetingAction,
  deleteMeetingAction,
} from '@/app/actions/planner';

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
  leadNote?: string | null;
  rescheduleReason?: string | null;
  postponeReason?: string | null;
  project?: { id: string; name: string } | null;
  pm?: { id: string; name: string } | null;
  note?: any;
};

type ProjectOption = { id: string; name: string };
type MemberOption = { id: string; name: string; email: string };

type MainTab = 'active' | 'completed' | 'rescheduled' | 'postponed' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  try {
    return format(new Date(iso), 'h:mm aa').replace(':00', '').toLowerCase();
  } catch {
    return '';
  }
}

function fmtDayHeader(date: Date) {
  const day = format(date, 'EEE'); // Mon
  const num = format(date, 'd');   // 8
  const mon = format(date, 'MMM'); // Jun
  return { day, num, mon };
}

function getMeetingTitle(m: Meeting) {
  if (m.project) return `Meeting — ${m.project.name}`;
  return m.leadName ? `Meeting with ${m.leadName}` : '15-Minute Intro Call';
}

function getMeetingWith(m: Meeting) {
  if (m.leadName) return m.leadName;
  if (m.pm?.name) return m.pm.name;
  return '';
}

// Dot color by status
const DOT_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-400',
  RESCHEDULED: 'bg-indigo-500',
  POSTPONED: 'bg-amber-500',
  COMPLETED: 'bg-emerald-400',
  CANCELLED: 'bg-slate-300',
  NO_SHOW: 'bg-rose-400',
};

// ─── Member Assignee Selector Component ─────────────────────────────────────

function MemberAssigneeSelector({
  members,
  selectedIds,
  onChange,
}: {
  members: MemberOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
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
      m => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [members, search]);

  const selectedMembers = members.filter(m => selectedIds.includes(m.id));

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full min-h-[38px] px-3 py-1.5 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-left text-xs flex items-center justify-between gap-2 hover:border-slate-300 transition-colors"
      >
        {selectedMembers.length === 0 ? (
          <span className="text-slate-400 font-medium">Unassigned</span>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap">
            {selectedMembers.map(m => {
              const initials = m.name
                ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                : 'U';
              return (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs font-semibold"
                >
                  <span className="w-4 h-4 rounded-full bg-[#52647a] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </span>
                  {m.name || m.email}
                </span>
              );
            })}
          </div>
        )}
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-72 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-white/10 rounded-[12px] shadow-2xl p-2.5 space-y-2">
          {/* Search Members Bar */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full h-8 px-3 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400 placeholder:text-slate-400"
            />
          </div>

          {/* Members List */}
          <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar">
            {filteredMembers.length === 0 ? (
              <p className="p-3 text-xs text-slate-400 text-center">No members found</p>
            ) : (
              filteredMembers.map(m => {
                const isSelected = selectedIds.includes(m.id);
                const initials = m.name
                  ? m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                  : 'U';
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        onChange(selectedIds.filter(id => id !== m.id));
                      } else {
                        onChange([...selectedIds, m.id]);
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-[8px] text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-white/10'
                        : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {/* Avatar Circle */}
                    <div className="w-8 h-8 rounded-full bg-[#52647a] text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {initials}
                    </div>

                    {/* Name & Email */}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {m.name || 'Member'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {m.email}
                      </div>
                    </div>

                    {/* Checkmark */}
                    {isSelected && (
                      <Check size={14} className="text-slate-900 dark:text-white shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Single meeting row ───────────────────────────────────────────────────────

function MeetingRow({ meeting, canManage }: { meeting: Meeting; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [note, setNote] = useState<any>(meeting.note);

  // Modals for 3 options
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isPostponeOpen, setIsPostponeOpen] = useState(false);

  const [reschedDate, setReschedDate] = useState('');
  const [reschedTime, setReschedTime] = useState('10:00');
  const [reschedReason, setReschedReason] = useState('');

  const [postponeReason, setPostponeReason] = useState('');

  const [isRescheduling, startReschedule] = useTransition();
  const [isPostponing, startPostpone] = useTransition();
  const [isCompleting, startComplete] = useTransition();

  const executeComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    startComplete(async () => {
      const res = await completeMeetingAction(meeting.id);
      if (res.success) {
        toast.success('Meeting marked as completed!');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to complete meeting.');
      }
    });
  };

  const actionItems: ActionItem[] = Array.isArray(note?.actionItems) ? note.actionItems : [];
  const keyPoints: string[] = Array.isArray(note?.keyPoints) ? note.keyPoints : [];

  const startT = fmtTime(meeting.startTime);
  const endT   = fmtTime(meeting.endTime);
  const withName = getMeetingWith(meeting);
  const title = getMeetingTitle(meeting);
  const dot = DOT_COLOR[meeting.status] ?? DOT_COLOR.SCHEDULED;

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = meeting.meetLink || 'https://meet.google.com/new';
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied to clipboard!');
  };

  const handleOpenReschedule = (e: React.MouseEvent) => {
    e.stopPropagation();
    setReschedReason(meeting.rescheduleReason || '');
    try {
      const d = new Date(meeting.startTime);
      setReschedDate(format(d, 'yyyy-MM-dd'));
      setReschedTime(format(d, 'HH:mm'));
    } catch {
      setReschedDate('');
      setReschedTime('10:00');
    }
    setIsRescheduleOpen(true);
  };

  const handleOpenPostpone = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPostponeReason(meeting.postponeReason || '');
    setIsPostponeOpen(true);
  };

  const executeReschedule = () => {
    if (!reschedDate || !reschedTime) return toast.error('Date and time are required.');
    const startIso = `${reschedDate}T${reschedTime}:00`;
    const startDateObj = new Date(startIso);
    const origDuration = new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime();
    const durationMs = origDuration > 0 ? origDuration : 30 * 60 * 1000;
    const endDateObj = new Date(startDateObj.getTime() + durationMs);

    startReschedule(async () => {
      const res = await rescheduleMeetingAction(
        meeting.id,
        startDateObj.toISOString(),
        endDateObj.toISOString(),
        reschedReason.trim()
      );
      if (res.success) {
        toast.success('Meeting rescheduled successfully!');
        setIsRescheduleOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to reschedule meeting.');
      }
    });
  };

  const executePostpone = () => {
    startPostpone(async () => {
      const res = await postponeMeetingAction(meeting.id, postponeReason.trim());
      if (res.success) {
        toast.success('Meeting postponed and moved to Postponed tab.');
        setIsPostponeOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to postpone meeting.');
      }
    });
  };

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

  const isEnded = new Date() > new Date(meeting.endTime);

  return (
    <div className="border border-slate-200 dark:border-white/10 rounded-[8px] bg-white dark:bg-[#1a1a1a] overflow-hidden">
      <div
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        {/* Time range */}
        <span className="text-[13px] text-slate-500 dark:text-slate-400 w-28 shrink-0 tabular-nums font-medium">
          {startT} – {endT}
        </span>

        {/* Status dot */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isEnded && meeting.status === 'SCHEDULED' ? 'bg-slate-400' : dot}`} />

        {/* Title + with + reason badge */}
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-bold text-slate-900 dark:text-white truncate">
              {title}
            </span>
            {withName && (
              <span className="font-normal text-slate-500 dark:text-slate-400 text-xs">
                with {withName}
              </span>
            )}
            {isEnded && meeting.status === 'SCHEDULED' && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider border border-slate-200 dark:border-white/10">
                Ended
              </span>
            )}
          </div>

          {/* Reason Badge */}
          {meeting.status === 'RESCHEDULED' && meeting.rescheduleReason && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              <span className="px-2 py-0.5 rounded-[4px] bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-900/40 inline-flex items-center gap-1">
                <RefreshCw size={11} /> Rescheduled Reason: "{meeting.rescheduleReason}"
              </span>
            </div>
          )}

          {meeting.status === 'POSTPONED' && meeting.postponeReason && (
            <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
              <span className="px-2 py-0.5 rounded-[4px] bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900/40 inline-flex items-center gap-1">
                <Clock size={11} /> Postponed Reason: "{meeting.postponeReason}"
              </span>
            </div>
          )}
        </div>

        {/* Action Options (Hidden when COMPLETED) */}
        {meeting.status === 'COMPLETED' ? (
          <span className="px-3 py-1.5 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shrink-0">
            <CheckCircle2 size={13} /> Completed
          </span>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            {/* 1. Copy Link */}
            {meeting.status !== 'POSTPONED' && (
              <button
                type="button"
                onClick={handleCopyLink}
                title="Copy meeting link"
                className="flex items-center gap-1 h-8 px-2.5 rounded-[6px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <Copy size={13} />
                <span className="hidden sm:inline">Copy link</span>
              </button>
            )}

            {/* 2. Reschedule */}
            {canManage && (
              <button
                type="button"
                onClick={handleOpenReschedule}
                title="Reschedule meeting"
                className="flex items-center gap-1 h-8 px-2.5 rounded-[6px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <CalendarDays size={13} />
                <span className="hidden sm:inline">Reschedule</span>
              </button>
            )}

            {/* 3. Postpone */}
            {canManage && meeting.status !== 'POSTPONED' && (
              <button
                type="button"
                onClick={handleOpenPostpone}
                title="Postpone meeting"
                className="flex items-center gap-1 h-8 px-2.5 rounded-[6px] border border-amber-200 dark:border-amber-900/30 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
              >
                <Clock size={13} />
                <span className="hidden sm:inline">Postpone</span>
              </button>
            )}

            {/* Join Link */}
            {meeting.meetLink && meeting.status !== 'POSTPONED' && (
              <a
                href={meeting.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 h-8 px-3 rounded-[6px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 transition-opacity ml-1"
              >
                <Video size={13} /> Join
              </a>
            )}
          </div>
        )}
      </div>

      {/* Expanded details */}
      {open && (
        <div className="px-5 pb-5 border-t border-slate-100 dark:border-white/5 pt-4 space-y-4">
          {/* Reasons in detail panel if available */}
          {meeting.rescheduleReason && (
            <div className="p-3 rounded-[8px] bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/30 text-xs text-indigo-900 dark:text-indigo-200 space-y-0.5">
              <strong className="font-bold flex items-center gap-1"><RefreshCw size={13} /> Reason for Rescheduling:</strong>
              <p>{meeting.rescheduleReason}</p>
            </div>
          )}

          {meeting.postponeReason && (
            <div className="p-3 rounded-[8px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/30 text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
              <strong className="font-bold flex items-center gap-1"><Clock size={13} /> Reason for Postponing:</strong>
              <p>{meeting.postponeReason}</p>
            </div>
          )}

          {meeting.status !== 'COMPLETED' && meeting.status !== 'POSTPONED' && (
            <div className="flex items-center gap-3 flex-wrap">
              {meeting.meetLink && (
                <a
                  href={meeting.meetLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  <Video size={15} /> Join Google Meet <ExternalLink size={13} />
                </a>
              )}

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                <Copy size={14} /> Copy Meeting Link
              </button>

              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenReschedule}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  <CalendarDays size={14} /> Reschedule Meeting
                </button>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={handleOpenPostpone}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-amber-200 dark:border-amber-900/30 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50 transition-colors"
                >
                  <Clock size={14} /> Postpone Meeting
                </button>
              )}
            </div>
          )}

          {meeting.status === 'POSTPONED' && canManage && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleOpenReschedule}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                <CalendarDays size={14} /> Reschedule Meeting
              </button>
            </div>
          )}

          {meeting.status !== 'POSTPONED' && (
            <>
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
                          <div key={i} className="flex items-center gap-2 rounded-[8px] border border-slate-200 dark:border-white/10 px-3 py-2">
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
                                className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-[6px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
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
                <div className="rounded-[8px] border border-dashed border-slate-200 dark:border-white/10 p-4 text-center">
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
                    className="w-full rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-400 resize-none"
                  />
                  <button type="button" onClick={generate} disabled={busy}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:opacity-90 disabled:opacity-50">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                    {note?.summary ? 'Regenerate notes' : 'Generate AI notes'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {isRescheduleOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[8px] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarDays size={18} /> Reschedule Meeting
              </h3>
              <button onClick={() => setIsRescheduleOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rescheduling <strong>"{title}"</strong>
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Date *</label>
                <input
                  type="date"
                  required
                  value={reschedDate}
                  onChange={e => setReschedDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Start Time *</label>
                <input
                  type="time"
                  required
                  value={reschedTime}
                  onChange={e => setReschedTime(e.target.value)}
                  className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason for Rescheduling (Optional)</label>
              <textarea
                rows={2}
                value={reschedReason}
                onChange={e => setReschedReason(e.target.value)}
                placeholder="e.g. Schedule conflict, client requested change..."
                className="w-full px-3 py-2 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRescheduleOpen(false)}
                className="h-8 px-3 rounded-[8px] text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRescheduling}
                onClick={executeReschedule}
                className="h-8 px-4 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
              >
                {isRescheduling ? 'Rescheduling...' : 'Save & Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Postpone Modal */}
      {isPostponeOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[8px] w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Postpone Meeting</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Moves this meeting to the Postponed tab.</p>
              </div>
            </div>

            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Postponing <strong>"{title}"</strong>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Reason for Postponing *</label>
              <textarea
                rows={3}
                required
                value={postponeReason}
                onChange={e => setPostponeReason(e.target.value)}
                placeholder="e.g. Client delayed project rollout, pending team feedback..."
                className="w-full px-3 py-2 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPostponeOpen(false)}
                className="h-8 px-3 rounded-[8px] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPostponing || !postponeReason.trim()}
                onClick={executePostpone}
                className="h-8 px-4 rounded-[8px] bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold disabled:opacity-50"
              >
                {isPostponing ? 'Postponing...' : 'Postpone Meeting'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MeetingsClient({
  meetings,
  role,
  projects = [],
  members = [],
}: {
  meetings: Meeting[];
  role: string;
  projects?: ProjectOption[];
  members?: MemberOption[];
}) {
  const router = useRouter();
  const canManage = role !== 'CLIENT';
  const [isSubmitting, startTransition] = useTransition();

  // 3 Main View Tabs: active | rescheduled | postponed | all
  const [mainTab, setMainTab] = useState<MainTab>('active');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  // Schedule Meeting Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [schedMeetingType, setSchedMeetingType] = useState<'EXTERNAL' | 'INTERNAL'>('INTERNAL');
  const [schedTitle, setSchedTitle] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('10:00');
  const [schedDuration, setSchedDuration] = useState<number>(30); // 30 mins
  const [schedParticipantName, setSchedParticipantName] = useState('');
  const [schedParticipantEmail, setSchedParticipantEmail] = useState('');
  const [schedCompany, setSchedCompany] = useState('');
  const [schedProjectId, setSchedProjectId] = useState('');
  const [schedAssignedMemberIds, setSchedAssignedMemberIds] = useState<string[]>([]);
  const [schedPlatform, setSchedPlatform] = useState('Google Meet');
  const [schedNote, setSchedNote] = useState('');

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterPanel(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const now = new Date();

  // Counts for main tabs
  const tabCounts = useMemo(() => {
    let active = 0;
    let completed = 0;
    let rescheduled = 0;
    let postponed = 0;

    meetings.forEach(m => {
      if (m.status === 'POSTPONED') {
        postponed++;
      } else if (m.status === 'RESCHEDULED') {
        rescheduled++;
      } else if (m.status === 'COMPLETED') {
        completed++;
      } else if (m.status === 'SCHEDULED') {
        active++;
      }
    });

    return { active, completed, rescheduled, postponed, total: meetings.length };
  }, [meetings]);

  // Reset modal state
  const resetScheduleForm = () => {
    setSchedMeetingType('INTERNAL');
    setSchedTitle('');
    setSchedDate('');
    setSchedTime('10:00');
    setSchedDuration(30);
    setSchedParticipantName('');
    setSchedParticipantEmail('');
    setSchedCompany('');
    setSchedProjectId('');
    setSchedAssignedMemberIds([]);
    setSchedPlatform('Google Meet');
    setSchedNote('');
  };

  const handleSaveSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedDate || !schedTime) {
      return toast.error('Date and Time are required.');
    }
    if (schedMeetingType === 'INTERNAL' && !schedProjectId) {
      return toast.error('Please select a Portal Client Project.');
    }
    if (!schedParticipantName.trim() && !schedTitle.trim()) {
      return toast.error('Please enter a meeting title or participant name.');
    }

    const startIso = `${schedDate}T${schedTime}:00`;
    const startDateObj = new Date(startIso);
    const endDateObj = new Date(startDateObj.getTime() + schedDuration * 60 * 1000);
    const endIso = endDateObj.toISOString();

    startTransition(async () => {
      const res = await createScheduledMeetingAction({
        meetingType: schedMeetingType,
        title: schedTitle.trim() || `Meeting with ${schedParticipantName.trim()}`,
        startTime: startIso,
        endTime: endIso,
        projectId: schedProjectId || undefined,
        leadName: schedParticipantName.trim() || undefined,
        leadEmail: schedParticipantEmail.trim() || undefined,
        leadCompany: schedCompany.trim() || undefined,
        leadNote: schedNote.trim() || undefined,
        meetLink: schedPlatform === 'Google Meet' ? 'https://meet.google.com/new' : undefined,
        assignedMemberIds: schedAssignedMemberIds,
      });

      if (res.success) {
        toast.success(
          schedMeetingType === 'INTERNAL'
            ? 'Portal Client meeting scheduled! Sent link to client email & added to Client Portal.'
            : 'External meeting scheduled & reminder created!'
        );
        resetScheduleForm();
        setIsScheduleModalOpen(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to schedule meeting.');
      }
    });
  };

  // Filter meetings by MainTab + search + filterStatus
  const filtered = useMemo(() => {
    let list = [...meetings];

    // Main Tab filtering
    if (mainTab === 'active') {
      list = list.filter(m => m.status === 'SCHEDULED');
    } else if (mainTab === 'completed') {
      list = list.filter(m => m.status === 'COMPLETED');
    } else if (mainTab === 'rescheduled') {
      list = list.filter(m => m.status === 'RESCHEDULED');
    } else if (mainTab === 'postponed') {
      list = list.filter(m => m.status === 'POSTPONED');
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        getMeetingTitle(m).toLowerCase().includes(q) ||
        (getMeetingWith(m) || '').toLowerCase().includes(q) ||
        (m.leadEmail || '').toLowerCase().includes(q) ||
        (m.rescheduleReason || '').toLowerCase().includes(q) ||
        (m.postponeReason || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      list = list.filter(m => m.status === filterStatus);
    }

    return list;
  }, [meetings, mainTab, search, filterStatus]);

  // Group by day
  const grouped = useMemo(() => {
    const map = new Map<string, { date: Date; meetings: Meeting[] }>();
    const sorted = [...filtered].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
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
    { value: 'RESCHEDULED', label: 'Rescheduled' },
    { value: 'POSTPONED', label: 'Postponed' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="w-full flex flex-col h-full bg-[#f8f9fa] dark:bg-[#111] -m-4 sm:-m-6 overflow-hidden">

      {/* Page header */}
      <div className="px-6 pt-5 pb-0 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Meetings</h1>

        {canManage && (
          <button
            onClick={() => { resetScheduleForm(); setIsScheduleModalOpen(true); }}
            className="flex items-center gap-1.5 h-9 px-4 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <Plus size={15} />
            Schedule meeting
          </button>
        )}
      </div>

      {/* 3 Main View Tabs (Active Meetings, Rescheduled Meetings, Postponed Meetings) */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-2 flex-wrap border-b border-slate-200 dark:border-white/10 mt-2">
        <button
          onClick={() => setMainTab('active')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            mainTab === 'active'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          {mainTab === 'active' && <CheckCircle2 size={15} className="fill-current" />}
          Active Meetings ({tabCounts.active})
        </button>

        <button
          onClick={() => setMainTab('completed')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            mainTab === 'completed'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <CheckCircle2 size={14} className="text-emerald-500" />
          Completed Meetings ({tabCounts.completed})
        </button>

        <button
          onClick={() => setMainTab('rescheduled')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            mainTab === 'rescheduled'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <RefreshCw size={14} />
          Rescheduled Meetings ({tabCounts.rescheduled})
        </button>

        <button
          onClick={() => setMainTab('postponed')}
          className={`flex items-center gap-2 h-9 px-4 rounded-[8px] text-xs font-bold transition-colors ${
            mainTab === 'postponed'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
          }`}
        >
          <Clock size={14} />
          Postponed Meetings ({tabCounts.postponed})
        </button>

        <button
          onClick={() => setMainTab('all')}
          className={`flex items-center gap-2 h-9 px-3 rounded-[8px] text-xs font-semibold transition-colors ${
            mainTab === 'all'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
          }`}
        >
          All ({tabCounts.total})
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-6 py-3 flex items-center gap-3 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, name, or reason..."
            className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-slate-400 placeholder:text-slate-400"
          />
        </div>

        {/* Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilterPanel(v => !v)}
            className={`flex items-center gap-2 h-9 px-3 rounded-[8px] border text-sm font-medium transition-colors ${
              showFilterPanel || filterStatus !== 'all'
                ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white bg-slate-100 dark:bg-white/10'
                : 'border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <Filter size={15} />
            Filter
            {filterStatus !== 'all' && (
              <span className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">1</span>
            )}
            <ChevronDown size={14} />
          </button>
          {showFilterPanel && (
            <div className="absolute left-0 top-11 z-50 w-52 bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 rounded-[8px] shadow-xl p-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1.5">Status</p>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setFilterStatus(opt.value); setShowFilterPanel(false); }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-slate-100 dark:hover:bg-white/5 text-sm text-slate-700 dark:text-slate-300"
                >
                  {opt.label}
                  {filterStatus === opt.value && <Check size={14} className="text-slate-900 dark:text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 pb-8 space-y-1 custom-scrollbar">

        {/* Active filter pill */}
        {filterStatus !== 'all' && (
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 h-7 pl-3 pr-2 rounded-[8px] bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200 text-[12px] font-medium border border-slate-300 dark:border-white/20">
              Status: {filterStatus}
              <button onClick={() => setFilterStatus('all')} className="hover:opacity-70"><X size={12} /></button>
            </span>
          </div>
        )}

        {/* Date groups */}
        {displayedGroups.length === 0 ? (
          /* Empty state */
          <div className="border border-slate-200 dark:border-white/10 rounded-[8px] bg-white dark:bg-[#1a1a1a] py-16 px-6 text-center mt-4">
            <div className="w-16 h-16 rounded-[8px] bg-slate-100 dark:bg-white/10 flex items-center justify-center mx-auto mb-4">
              <CalIcon size={32} className="text-slate-700 dark:text-slate-300" />
            </div>
            <p className="text-[15px] font-bold text-slate-900 dark:text-white mb-1">
              {mainTab === 'rescheduled'
                ? 'No rescheduled meetings'
                : mainTab === 'postponed'
                ? 'No postponed meetings'
                : 'No active meetings'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {mainTab === 'rescheduled'
                ? 'Rescheduled meetings will appear here with the reason provided.'
                : mainTab === 'postponed'
                ? 'Postponed meetings will appear here along with the reason provided.'
                : 'You have no active upcoming meetings.'}
            </p>
            {canManage && mainTab === 'active' && (
              <button
                onClick={() => { resetScheduleForm(); setIsScheduleModalOpen(true); }}
                className="mt-5 h-9 px-5 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-2xs"
              >
                Schedule meeting
              </button>
            )}
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
                    <span className={isTodayDate ? 'text-slate-900 dark:text-white font-extrabold' : ''}>
                      {num} {mon}
                    </span>
                  </span>
                  {isTodayDate && (
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                      Today
                    </span>
                  )}
                </div>

                {/* Timeline line for today */}
                {isTodayDate && (
                  <div className="relative mb-2">
                    <div className="h-[2px] bg-slate-800 dark:bg-white w-full rounded-full" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-white" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-800 dark:bg-white" />
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
              className="h-9 px-6 rounded-[8px] border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1f1f1f] text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              View more meetings
            </button>
          </div>
        )}
      </div>

      {/* Schedule Meeting Modal (Grid Form with Fixed Header/Footer and Input Scroller) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 rounded-[12px] w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Fixed Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-white dark:bg-[#1a1a1a]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CalIcon size={18} /> Schedule Meeting
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set meeting time, project attachments, and team assignees.
                </p>
              </div>

              <button
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form with Scrollable Input Fields */}
            <form onSubmit={handleSaveSchedule} className="flex-1 flex flex-col min-h-0">
              
              {/* Scrollable Inputs Section */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
                
                {/* Meeting Type (Grid Switcher) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Meeting Scope *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSchedMeetingType('INTERNAL')}
                      className={`h-10 px-3 rounded-[8px] border text-xs font-bold transition-colors flex flex-col items-center justify-center ${
                        schedMeetingType === 'INTERNAL'
                          ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900 dark:border-white shadow-2xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5"><Building2 size={14} /> Internal (Portal Client)</span>
                      <span className="text-[10px] font-normal opacity-80">Existing Portal Client & Project</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSchedMeetingType('EXTERNAL')}
                      className={`h-10 px-3 rounded-[8px] border text-xs font-bold transition-colors flex flex-col items-center justify-center ${
                        schedMeetingType === 'EXTERNAL'
                          ? 'border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-900 dark:border-white shadow-2xs'
                          : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex items-center gap-1.5"><Users size={14} /> External (Guest / Lead)</span>
                      <span className="text-[10px] font-normal opacity-80">Non-Portal Outside Guest</span>
                    </button>
                  </div>
                </div>

                {/* Property Grid Form Fields */}
                <div className="grid grid-cols-2 gap-3.5">

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <CalIcon size={13} /> Select Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={schedDate}
                      onChange={e => setSchedDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Start Time */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={13} /> Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={schedTime}
                      onChange={e => setSchedTime(e.target.value)}
                      className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Duration */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Clock size={13} /> Duration
                    </label>
                    <select
                      value={schedDuration}
                      onChange={e => setSchedDuration(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                    >
                      <option value={15}>15 Minutes</option>
                      <option value={30}>30 Minutes</option>
                      <option value={45}>45 Minutes</option>
                      <option value={60}>60 Minutes (1 Hour)</option>
                      <option value={90}>90 Minutes (1.5 Hours)</option>
                    </select>
                  </div>

                  {/* Platform */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Video size={13} /> Platform
                    </label>
                    <select
                      value={schedPlatform}
                      onChange={e => setSchedPlatform(e.target.value)}
                      className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                    >
                      <option value="Google Meet">Google Meet</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Teams">Microsoft Teams</option>
                      <option value="In-person">In-person</option>
                    </select>
                  </div>

                  {/* Portal Project (Internal Portal Client flow) */}
                  {schedMeetingType === 'INTERNAL' ? (
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building2 size={13} /> Select Portal Client Project *
                      </label>
                      <select
                        required
                        value={schedProjectId}
                        onChange={e => setSchedProjectId(e.target.value)}
                        className="w-full h-9 px-3 rounded-[8px] border border-slate-300 dark:border-white/20 bg-white dark:bg-[#1a1a1a] text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-slate-400"
                      >
                        <option value="">Choose Project (e.g. aydi active)...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {/* Team Assignee Popover Selector */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <UserCheck size={13} /> Team Assignees / Attending Members
                    </label>
                    <MemberAssigneeSelector
                      members={members}
                      selectedIds={schedAssignedMemberIds}
                      onChange={setSchedAssignedMemberIds}
                    />
                  </div>

                  {/* Participant Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Users size={13} /> Participant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={schedParticipantName}
                      onChange={e => setSchedParticipantName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Participant Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      Participant Email
                    </label>
                    <input
                      type="email"
                      value={schedParticipantEmail}
                      onChange={e => setSchedParticipantEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400"
                    />
                  </div>

                  {/* Meeting Title (Full Width) */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Meeting Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={schedTitle}
                      onChange={e => setSchedTitle(e.target.value)}
                      placeholder="e.g. Project Review & Strategy Sync"
                      className="w-full h-9 px-3 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400 font-semibold"
                    />
                  </div>

                  {/* Agenda / Notes (Full Width) */}
                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Agenda / Notes (Optional)
                    </label>
                    <textarea
                      rows={2.5}
                      value={schedNote}
                      onChange={e => setSchedNote(e.target.value)}
                      placeholder="Meeting agenda or details..."
                      className="w-full px-3 py-2 rounded-[8px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] text-xs text-slate-900 dark:text-white outline-none focus:border-slate-400 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Fixed Modal Footer */}
              <div className="px-6 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-end gap-3 shrink-0 bg-white dark:bg-[#1a1a1a]">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="h-9 px-4 rounded-[8px] border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-9 px-5 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Save & Schedule Meeting'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
