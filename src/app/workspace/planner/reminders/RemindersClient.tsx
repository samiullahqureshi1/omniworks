'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckSquare, Video, Check, Clock, AlarmClockOff } from 'lucide-react';

type Reminder = { id: string; kind: 'task' | 'meeting'; title: string; date: string; meta: string | null; href: string | null };

const DISMISS_KEY = 'omniwork_reminders_dismissed'; // { [id]: untilTimestamp | 'done' }

function loadState(): Record<string, number | 'done'> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}');
  } catch {
    return {};
  }
}

function relative(dateIso: string) {
  const diff = new Date(dateIso).getTime() - Date.now();
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  const abs = new Date(dateIso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  if (days <= 0) return `Today · ${abs}`;
  if (days === 1) return `Tomorrow · ${abs}`;
  return `In ${days} days · ${abs}`;
}

export default function RemindersClient({ reminders }: { reminders: Reminder[] }) {
  const [state, setState] = useState<Record<string, number | 'done'>>({});

  useEffect(() => setState(loadState()), []);

  const persist = (next: Record<string, number | 'done'>) => {
    setState(next);
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  };

  const markDone = (id: string) => persist({ ...state, [id]: 'done' });
  const snooze = (id: string) => persist({ ...state, [id]: Date.now() + 24 * 60 * 60 * 1000 });

  const visible = useMemo(() => {
    const now = Date.now();
    return reminders.filter((r) => {
      const s = state[r.id];
      if (s === 'done') return false;
      if (typeof s === 'number' && s > now) return false;
      return true;
    });
  }, [reminders, state]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="text-slate-500" size={22} /> Reminders
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Upcoming deadlines and meetings, all in one place.</p>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-12 text-center">
          <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">You're all caught up</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">No upcoming deadlines or meetings need attention.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((r) => (
            <div key={r.id} className="group flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${r.kind === 'meeting' ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'}`}>
                {r.kind === 'meeting' ? <Video size={16} /> : <CheckSquare size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                {r.href ? (
                  <Link href={r.href} className="text-sm font-semibold text-slate-900 dark:text-white truncate hover:underline block">{r.title}</Link>
                ) : (
                  <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.title}</div>
                )}
                <div className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                  <Clock size={11} /> {relative(r.date)}{r.meta ? ` · ${r.meta}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => snooze(r.id)} title="Snooze 1 day"
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10">
                  <AlarmClockOff size={16} />
                </button>
                <button type="button" onClick={() => markDone(r.id)} title="Mark done"
                  className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20">
                  <Check size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400 dark:text-slate-500">Mark done / snooze are saved on this device.</p>
    </div>
  );
}
