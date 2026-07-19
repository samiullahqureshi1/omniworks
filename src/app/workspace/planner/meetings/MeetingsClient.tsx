'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Video, ChevronDown, ChevronRight, Sparkles, Loader2, ExternalLink, ListChecks,
  FileText, Plus, Clock,
} from 'lucide-react';
import { analyzeMeetingAction, saveManualNotesAction, createTaskFromActionItemAction } from '@/app/actions/meetingNotes';

type ActionItem = { text: string; assignee_guess: string | null; due_date_guess: string | null };

function fmt(dateIso: string) {
  return new Date(dateIso).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400',
  NO_SHOW: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
};

function MeetingCard({ meeting, canManage }: { meeting: any; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [note, setNote] = useState<any>(meeting.note);

  const actionItems: ActionItem[] = Array.isArray(note?.actionItems) ? note.actionItems : [];
  const keyPoints: string[] = Array.isArray(note?.keyPoints) ? note.keyPoints : [];

  const generate = async () => {
    setBusy(true);
    const res = await analyzeMeetingAction({ meetingId: meeting.id, transcriptText: transcript.trim() || undefined });
    setBusy(false);
    if (res.error) toast.error(res.error);
    else {
      setNote(res.note);
      setTranscript('');
      toast.success('Notes generated');
    }
  };

  const convert = async (item: ActionItem) => {
    const res = await createTaskFromActionItemAction({
      meetingId: meeting.id,
      text: item.text,
      dueDateGuess: item.due_date_guess,
    });
    if (res.error) toast.error(res.error);
    else {
      toast.success('Task created');
      router.refresh();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
          <Video size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {meeting.project ? `Meeting — ${meeting.project.name}` : `Intro call${meeting.leadName ? ` · ${meeting.leadName}` : ''}`}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
            <Clock size={12} /> {fmt(meeting.startTime)}
            {meeting.pm?.name && <span>· {meeting.pm.name}</span>}
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${STATUS_STYLES[meeting.status] || STATUS_STYLES.SCHEDULED}`}>
          {meeting.status}
        </span>
        {open ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/5 pt-4 space-y-4">
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

          {/* AI notes */}
          {note?.summary ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5"><Sparkles size={12} /> Summary</div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{note.summary}</p>
              </div>
              {keyPoints.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">Key points</div>
                  <ul className="list-disc pl-5 text-sm text-slate-700 dark:text-slate-300 space-y-0.5">
                    {keyPoints.map((k, i) => <li key={i}>{k}</li>)}
                  </ul>
                </div>
              )}
              {actionItems.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5"><ListChecks size={12} /> Action items</div>
                  <div className="flex flex-col gap-1.5">
                    {actionItems.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-slate-800 dark:text-slate-200 truncate">{a.text}</div>
                          {(a.assignee_guess || a.due_date_guess) && (
                            <div className="text-[11px] text-slate-400 dark:text-slate-500">
                              {a.assignee_guess && <span>{a.assignee_guess}</span>}
                              {a.assignee_guess && a.due_date_guess && ' · '}
                              {a.due_date_guess && <span>{a.due_date_guess}</span>}
                            </div>
                          )}
                        </div>
                        {canManage && meeting.project && (
                          <button
                            type="button"
                            onClick={() => convert(a)}
                            className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                          >
                            <Plus size={12} /> Task
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {note.notes && (
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5"><FileText size={12} /> Notes</div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{note.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-4 text-center">
              <FileText className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {note?.transcriptStatus === 'UNAVAILABLE' ? 'No transcript was available' : 'No notes yet'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {canManage ? 'Generate notes automatically, or paste a transcript below.' : 'The meeting host can generate notes.'}
              </p>
            </div>
          )}

          {/* Manage: generate / manual transcript */}
          {canManage && (
            <div className="space-y-2">
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={3}
                placeholder="Paste a transcript or notes to analyze with AI (optional)…"
                className="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-400 resize-none"
              />
              <button
                type="button"
                onClick={generate}
                disabled={busy}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
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

export default function MeetingsClient({ meetings, role }: { meetings: any[]; role: string }) {
  const canManage = role !== 'CLIENT';
  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: any[] = [];
    const pa: any[] = [];
    for (const m of meetings) {
      (new Date(m.startTime).getTime() >= now ? up : pa).push(m);
    }
    up.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { upcoming: up, past: pa };
  }, [meetings, now]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Video className="text-slate-500" size={22} /> Meetings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Your booked meetings, Meet links, and AI notes.</p>
      </div>

      {meetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center">
          <Video className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No meetings yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Meetings booked through your booking links will appear here.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Upcoming</h2>
              {upcoming.map((m) => <MeetingCard key={m.id} meeting={m} canManage={canManage} />)}
            </div>
          )}
          {past.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Past</h2>
              {past.map((m) => <MeetingCard key={m.id} meeting={m} canManage={canManage} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
