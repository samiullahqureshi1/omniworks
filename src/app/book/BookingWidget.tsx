'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
  Loader2,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { bookProjectMeetingAction, bookLeadMeetingAction } from '@/app/actions/booking';
import styles from './BookingWidget.module.css';

type Slot = { start: string; end: string };
type DaySlots = { date: string; weekday: number; slots: Slot[] };

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dateFromKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function timezoneName(timezone: string) {
  if (timezone === 'Asia/Karachi') return 'Pakistan, Maldives Time';
  return timezone.replaceAll('_', ' ').replace('/', ' – ');
}

export default function BookingWidget({
  mode,
  identifier,
  title,
  attendeeName,
  timezone,
  slotDurationMinutes,
  initialDays,
}: {
  mode: 'project' | 'lead';
  identifier: string;
  title: string;
  subtitle?: string;
  attendeeName?: string | null;
  timezone: string;
  slotDurationMinutes: number;
  initialDays: DaySlots[];
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [clockLabel, setClockLabel] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [note, setNote] = useState('');

  const firstDate = initialDays[0]?.date ? dateFromKey(initialDays[0].date) : new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), 1)));

  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long', month: 'long', day: 'numeric' }),
    [timezone]
  );
  const shortDayFmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', month: 'short', day: 'numeric' }),
    [timezone]
  );
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit' }),
    [timezone]
  );
  const available = useMemo(() => new Map(initialDays.map((day) => [day.date, day])), [initialDays]);
  const selectedDay = selectedDate ? available.get(selectedDate) : undefined;
  const leadReady = mode === 'lead' ? name.trim().length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) : true;

  useEffect(() => {
    const updateClock = () => {
      setClockLabel(new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()).replace(' ', '').toLowerCase());
    };
    updateClock();
    const timer = window.setInterval(updateClock, 60_000);
    return () => window.clearInterval(timer);
  }, [timezone]);

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getUTCFullYear();
    const month = visibleMonth.getUTCMonth();
    const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const mondayOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    return [
      ...Array.from({ length: mondayOffset }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [visibleMonth]);

  const confirm = async () => {
    if (!selected) return;
    setBooking(true);
    const res = mode === 'project'
      ? await bookProjectMeetingAction({ projectSlug: identifier, startIso: selected.start, endIso: selected.end, note: note.trim() || undefined })
      : await bookLeadMeetingAction({
          org: identifier,
          startIso: selected.start,
          endIso: selected.end,
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          note: note.trim() || undefined,
        });
    setBooking(false);
    if (res.error) toast.error(res.error);
    else setConfirmed(true);
  };

  const selectDay = (key: string) => {
    setSelectedDate(key);
    setSelected(null);
    setShowForm(false);
  };

  if (confirmed && selected) {
    return (
      <main className={styles.pageShell}>
        <section className={`${styles.bookingCard} ${styles.confirmedCard}`}>
          <div className={styles.successIcon}><Check /></div>
          <h1>You&apos;re scheduled</h1>
          <p>A calendar invitation has been sent to your email address.</p>
          <div className={styles.confirmedDetails}>
            <strong>{title}</strong>
            <span>{dayFmt.format(new Date(selected.start))}</span>
            <span>{timeFmt.format(new Date(selected.start))}–{timeFmt.format(new Date(selected.end))}</span>
            <span><Video size={18} /> Web conferencing details to follow.</span>
          </div>
          <div className={styles.brandFooter}>Powered by <b>OmniWork</b></div>
        </section>
      </main>
    );
  }

  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(visibleMonth);

  return (
    <main className={styles.pageShell}>
      <section className={`${styles.bookingCard} ${selectedDate && !showForm ? styles.withTimes : ''} ${showForm ? styles.withForm : ''}`}>
        <div className={styles.poweredRibbon} aria-label="Powered by OmniWork">
          <small>POWERED BY</small>
          <strong>OmniWork</strong>
        </div>

        <aside className={styles.eventPanel}>
          <div>
            <div className={styles.hostName}>{attendeeName || 'OmniWork'}</div>
            <h1>{title}</h1>
            <div className={styles.eventMeta}>
              <div><Clock3 /><span>{slotDurationMinutes} min</span></div>
              <div><Video /><span>Web conferencing details provided upon confirmation.</span></div>
            </div>
          </div>
          <footer>
            <button type="button" onClick={() => toast.info('Cookie preferences saved for this device.')}>Cookie settings</button>
            <Link href="/privacy-policy">Privacy Policy</Link>
          </footer>
        </aside>

        {showForm && selected ? (
          <section className={styles.formPanel}>
            <button type="button" className={styles.backButton} onClick={() => setShowForm(false)} aria-label="Back to available times">
              <ArrowLeft />
            </button>
            <h2>Enter Details</h2>
            <div className={styles.chosenTime}>
              <strong>{shortDayFmt.format(new Date(selected.start))}</strong>
              <span>{timeFmt.format(new Date(selected.start))}–{timeFmt.format(new Date(selected.end))}</span>
              <span>{timezoneName(timezone)}</span>
            </div>
            {mode === 'lead' && (
              <div className={styles.formFields}>
                <label>Name *</label>
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" />
                <label>Email *</label>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
                <label>Company</label>
                <input value={company} onChange={(event) => setCompany(event.target.value)} />
                <label>Please share anything that will help prepare for our meeting.</label>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
              </div>
            )}
            {mode === 'project' && (
              <div className={styles.formFields}>
                <label>Anything we should know before the meeting?</label>
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} />
              </div>
            )}
            <button className={styles.scheduleButton} type="button" onClick={confirm} disabled={!leadReady || booking}>
              {booking ? <><Loader2 className={styles.spinner} /> Scheduling…</> : 'Schedule Event'}
            </button>
          </section>
        ) : (
          <>
            <section className={styles.calendarPanel}>
              <h2>Select a Date &amp; Time</h2>
              <div className={styles.monthNav}>
                <button type="button" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month - 1, 1)))} aria-label="Previous month"><ChevronLeft /></button>
                <strong>{monthLabel}</strong>
                <button type="button" onClick={() => setVisibleMonth(new Date(Date.UTC(year, month + 1, 1)))} aria-label="Next month"><ChevronRight /></button>
              </div>
              <div className={styles.calendarGrid}>
                {weekDays.map((day) => <span className={styles.weekDay} key={day}>{day}</span>)}
                {calendarDays.map((day, index) => {
                  if (!day) return <span key={`empty-${index}`} />;
                  const key = dateKey(year, month, day);
                  const dayAvailable = available.has(key);
                  const isSelected = selectedDate === key;
                  const isToday = new Date().toLocaleDateString('en-CA', { timeZone: timezone }) === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      disabled={!dayAvailable}
                      onClick={() => selectDay(key)}
                      className={`${dayAvailable ? styles.availableDay : ''} ${isSelected ? styles.selectedDay : ''}`}
                      aria-label={`${dayAvailable ? 'Select' : 'Unavailable'} ${key}`}
                    >
                      {day}
                      {isToday && <i />}
                    </button>
                  );
                })}
              </div>
              <div className={styles.timezoneBlock}>
                <strong>Time zone</strong>
                <button type="button"><Globe2 /> {timezoneName(timezone)} {clockLabel && `(${clockLabel})`} <ChevronDown /></button>
              </div>
            </section>

            {selectedDate && selectedDay && (
              <section className={styles.timesPanel}>
                <h3>{dayFmt.format(dateFromKey(selectedDate))}</h3>
                <div className={styles.timesList}>
                  {selectedDay.slots.map((slot) => {
                    const active = selected?.start === slot.start;
                    return active ? (
                      <div className={styles.activeTimeRow} key={slot.start}>
                        <button type="button" className={styles.activeTime}>{timeFmt.format(new Date(slot.start))}</button>
                        <button type="button" className={styles.nextButton} onClick={() => setShowForm(true)}>Next</button>
                      </div>
                    ) : (
                      <button type="button" className={styles.timeButton} key={slot.start} onClick={() => setSelected(slot)}>
                        {timeFmt.format(new Date(slot.start))}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
