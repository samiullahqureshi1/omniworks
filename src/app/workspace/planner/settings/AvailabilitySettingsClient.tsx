'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Clock, Globe, Users, CalendarOff, Plus, X, Link2, Copy, Video, CheckCircle2 } from 'lucide-react';
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
const SLOT_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

function minutesToHHMM(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
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
  const [saving, setSaving] = useState(false);
  const [s, setS] = useState<Settings>(initialSettings);
  const [newBlockedDate, setNewBlockedDate] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!googleStatus) return;
    const m = GOOGLE_STATUS_MESSAGES[googleStatus];
    if (m) m.type === 'success' ? toast.success(m.msg) : toast.error(m.msg);
    // Clean the query param so the toast doesn't repeat on refresh.
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
      // @ts-ignore - supportedValuesOf is widely available
      const list = Intl.supportedValuesOf?.('timeZone') as string[] | undefined;
      if (list && list.length) return list;
    } catch {}
    return ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Dubai', 'Australia/Sydney'];
  }, []);

  const toggleDay = (d: number) => {
    setS((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(d)
        ? prev.workingDays.filter((x) => x !== d)
        : [...prev.workingDays, d].sort((a, b) => a - b),
    }));
  };

  const addBlockedDate = () => {
    if (!newBlockedDate) return;
    if (s.blockedDates.includes(newBlockedDate)) return;
    setS((prev) => ({ ...prev, blockedDates: [...prev.blockedDates, newBlockedDate].sort() }));
    setNewBlockedDate('');
  };

  const save = async () => {
    if (s.workingHoursEnd <= s.workingHoursStart) {
      toast.error('Working hours end must be after start.');
      return;
    }
    if (s.workingDays.length === 0) {
      toast.error('Select at least one working day.');
      return;
    }
    setSaving(true);
    const res = await updateAvailabilitySettingsAction(s);
    setSaving(false);
    if (res.error) toast.error(res.error);
    else {
      toast.success('Availability updated');
      router.refresh();
    }
  };

  const generalBookingUrl = `${appUrl || ''}/book?org=${encodeURIComponent(orgParam)}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarClock className="text-slate-500" size={24} /> Booking Availability
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Organization-wide availability used by every project booking link and the general intro-call link.
        </p>
      </div>

      {/* General booking link */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
          <Link2 size={16} /> General intro-call link
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Share this with new leads who don't have a project yet. Each existing project also has its own link at <code className="text-slate-600 dark:text-slate-300">/book/[project-slug]</code>.
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={generalBookingUrl}
            className="flex-1 h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 px-3 text-sm text-slate-700 dark:text-slate-300 outline-none"
          />
          <button
            type="button"
            onClick={() => { navigator.clipboard?.writeText(generalBookingUrl); toast.success('Copied'); }}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            <Copy size={14} /> Copy
          </button>
        </div>
      </div>

      {/* Google Calendar connection */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2">
          <Video size={16} /> Google Calendar &amp; Meet
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Connect a Google account so booked meetings create a calendar event with a Meet link and invite attendees automatically.
        </p>
        {!googleConfigured ? (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg px-3 py-2">
            Google isn't configured on the server yet. Add <code>GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code> and <code>GOOGLE_REDIRECT_URI</code> to your environment (see <code>.env.example</code>).
          </div>
        ) : googleConnectedEmail ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Connected as <span className="font-semibold">{googleConnectedEmail}</span>
            </div>
            <button
              type="button"
              onClick={disconnectGoogle}
              disabled={disconnecting}
              className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </button>
          </div>
        ) : (
          <a
            href="/api/integrations/google/connect"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            <Video size={15} /> Connect Google Calendar
          </a>
        )}
      </div>

      {/* Working days */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
          <CalendarClock size={16} /> Working days
        </div>
        <div className="flex flex-wrap gap-2">
          {DAY_LABELS.map((label, d) => {
            const on = s.workingDays.includes(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                  on
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                    : 'bg-white dark:bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Working hours + timezone + slot duration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            <Clock size={16} /> Working hours
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={minutesToHHMM(s.workingHoursStart)}
              onChange={(e) => setS((p) => ({ ...p, workingHoursStart: hhmmToMinutes(e.target.value) }))}
              className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent dark:text-white px-3 text-sm outline-none"
            />
            <span className="text-slate-400">to</span>
            <input
              type="time"
              value={minutesToHHMM(s.workingHoursEnd)}
              onChange={(e) => setS((p) => ({ ...p, workingHoursEnd: hhmmToMinutes(e.target.value) }))}
              className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent dark:text-white px-3 text-sm outline-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
            <Clock size={16} /> Slot duration
          </div>
          <select
            value={s.slotDurationMinutes}
            onChange={(e) => setS((p) => ({ ...p, slotDurationMinutes: Number(e.target.value) }))}
            className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
          >
            {SLOT_OPTIONS.map((o) => (
              <option key={o} value={o}>{o} minutes</option>
            ))}
          </select>
        </div>
      </div>

      {/* Timezone */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
          <Globe size={16} /> Timezone
        </div>
        <select
          value={s.timezone}
          onChange={(e) => setS((p) => ({ ...p, timezone: e.target.value }))}
          className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </div>

      {/* Default intro-call attendee */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          <Users size={16} /> Default intro-call host
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Handles bookings from the general <code className="text-slate-600 dark:text-slate-300">/book</code> link (new leads with no project yet).
        </p>
        <select
          value={s.defaultIntroCallAttendeeId || ''}
          onChange={(e) => setS((p) => ({ ...p, defaultIntroCallAttendeeId: e.target.value || null }))}
          className="h-10 w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] dark:text-white px-3 text-sm outline-none"
        >
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>{h.name} ({h.role.toLowerCase()})</option>
          ))}
        </select>
      </div>

      {/* Blocked dates */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
          <CalendarOff size={16} /> Blocked dates / holidays
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="date"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-transparent dark:text-white px-3 text-sm outline-none"
          />
          <button
            type="button"
            onClick={addBlockedDate}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {s.blockedDates.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">No blocked dates.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {s.blockedDates.map((d) => (
              <span key={d} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-slate-100 dark:bg-white/10 text-sm font-medium text-slate-700 dark:text-slate-200">
                {d}
                <button
                  type="button"
                  onClick={() => setS((p) => ({ ...p, blockedDates: p.blockedDates.filter((x) => x !== d) }))}
                  className="p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-white/10"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-11 px-6 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save availability'}
        </button>
      </div>
    </div>
  );
}
