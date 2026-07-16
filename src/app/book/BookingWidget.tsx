'use client';

import React, { useMemo, useState } from 'react';
import { CalendarCheck, Clock, Globe, Check, Loader2, ArrowLeft, Video } from 'lucide-react';
import { toast } from 'sonner';
import { bookProjectMeetingAction, bookLeadMeetingAction } from '@/app/actions/booking';

type Slot = { start: string; end: string };
type DaySlots = { date: string; weekday: number; slots: Slot[] };

export default function BookingWidget({
  mode,
  identifier,
  title,
  subtitle,
  attendeeName,
  timezone,
  slotDurationMinutes,
  initialDays,
}: {
  mode: 'project' | 'lead';
  identifier: string; // projectSlug or org param
  title: string;
  subtitle?: string;
  attendeeName?: string | null;
  timezone: string;
  slotDurationMinutes: number;
  initialDays: DaySlots[];
}) {
  const [days] = useState<DaySlots[]>(initialDays);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Lead form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [note, setNote] = useState('');

  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }),
    [timezone]
  );
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }),
    [timezone]
  );

  const leadReady = mode === 'lead' ? name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) : true;

  const confirm = async () => {
    if (!selected) return;
    setBooking(true);
    const res =
      mode === 'project'
        ? await bookProjectMeetingAction({ projectSlug: identifier, startIso: selected.start, endIso: selected.end, note: note.trim() || undefined })
        : await bookLeadMeetingAction({ org: identifier, startIso: selected.start, endIso: selected.end, name: name.trim(), email: email.trim(), company: company.trim() || undefined, note: note.trim() || undefined });
    setBooking(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      setConfirmed(true);
    }
  };

  if (confirmed && selected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0c0c0e]">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
            <Check size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">You're booked!</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            {dayFmt.format(new Date(selected.start))} · {timeFmt.format(new Date(selected.start))}–{timeFmt.format(new Date(selected.end))}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 flex items-center justify-center gap-1.5">
            <Video size={13} /> A calendar invite with a meeting link will be sent shortly.
          </p>
        </div>
      </div>
    );
  }

  const hasAnySlots = days.some((d) => d.slots.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0c0c0e] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="rounded-t-2xl border border-b-0 border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] p-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
            <CalendarCheck size={14} /> Book a meeting
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><Clock size={13} /> {slotDurationMinutes} min</span>
            <span className="flex items-center gap-1.5"><Globe size={13} /> {timezone}</span>
            {attendeeName && <span className="flex items-center gap-1.5">with {attendeeName}</span>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 rounded-b-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151518] overflow-hidden">
          {/* Slots */}
          <div className={`lg:col-span-2 p-6 ${mode === 'lead' ? 'lg:border-r border-slate-100 dark:border-white/5' : ''}`}>
            {!hasAnySlots ? (
              <div className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                No available times in the next two weeks. Please check back later.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {days.filter((d) => d.slots.length > 0).map((day) => (
                  <div key={day.date}>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {dayFmt.format(new Date(day.slots[0].start))}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {day.slots.map((slot) => {
                        const active = selected?.start === slot.start;
                        return (
                          <button
                            key={slot.start}
                            type="button"
                            onClick={() => setSelected(slot)}
                            className={`h-9 rounded-lg text-sm font-semibold border transition-colors ${
                              active
                                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                                : 'bg-white dark:bg-transparent text-slate-700 dark:text-slate-200 border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30'
                            }`}
                          >
                            {timeFmt.format(new Date(slot.start))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column: lead form (lead mode) or confirm (project mode) */}
          <div className="p-6 bg-slate-50/50 dark:bg-white/5">
            {mode === 'lead' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Name *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe"
                    className="mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Email *</label>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="jane@company.com"
                    className="mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Company</label>
                  <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc."
                    className="mt-1 w-full h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none focus:ring-1 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300">What would you like to discuss?</label>
                  <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Optional"
                    className="mt-1 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-slate-400 resize-none" />
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 mb-4 min-h-[64px] flex items-center">
              {selected ? (
                <div className="text-sm">
                  <div className="font-bold text-slate-900 dark:text-white">{dayFmt.format(new Date(selected.start))}</div>
                  <div className="text-slate-500 dark:text-slate-400">
                    {timeFmt.format(new Date(selected.start))}–{timeFmt.format(new Date(selected.end))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">Select a time to continue</div>
              )}
            </div>

            <button
              type="button"
              onClick={confirm}
              disabled={!selected || !leadReady || booking}
              className="w-full h-11 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {booking ? <><Loader2 size={16} className="animate-spin" /> Booking...</> : 'Confirm booking'}
            </button>
            {mode === 'lead' && !leadReady && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                Enter your name and email to confirm.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
