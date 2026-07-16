/**
 * Slot generation + conflict filtering for the booking pages.
 *
 * All persisted times are UTC. Working hours are expressed as "minutes from
 * midnight" in the organization's timezone, so we convert wall-clock times in
 * that timezone to UTC instants using Intl (no tz library is installed).
 */

export interface AvailabilitySettings {
  workingDays: number[]; // 0=Sun .. 6=Sat
  workingHoursStart: number; // minutes from midnight, org tz
  workingHoursEnd: number; // minutes from midnight, org tz
  timezone: string; // IANA, e.g. "America/New_York"
  slotDurationMinutes: number;
  blockedDates: Date[]; // whole-day holidays (compared by calendar date)
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface Slot {
  start: string; // ISO UTC
  end: string; // ISO UTC
}

export interface DaySlots {
  date: string; // YYYY-MM-DD (org tz calendar date)
  weekday: number; // 0-6
  slots: Slot[];
}

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

/** The offset (ms) that `tz` has at the given UTC instant: wallClockAsUTC - utc. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const map: Record<string, number> = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = Number(p.value);
  // Intl returns hour 24 for midnight in some engines; normalize.
  const hour = map.hour === 24 ? 0 : map.hour;
  const asIfUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return asIfUtc - utcMs;
}

/** Convert a wall-clock time in `tz` to the corresponding UTC Date (DST-safe, two-pass). */
export function zonedWallTimeToUtc(
  y: number,
  m: number,
  d: number,
  minutesFromMidnight: number,
  tz: string
): Date {
  const hour = Math.floor(minutesFromMidnight / 60);
  const minute = minutesFromMidnight % 60;
  const guess = Date.UTC(y, m - 1, d, hour, minute);
  const offset1 = tzOffsetMs(guess, tz);
  // Refine once to handle DST boundaries.
  const offset2 = tzOffsetMs(guess - offset1, tz);
  return new Date(guess - offset2);
}

/** Calendar Y-M-D of a UTC instant as seen in `tz`. */
export function ymdInTz(date: Date, tz: string): Ymd {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) if (p.type !== "literal") map[p.type] = Number(p.value);
  return { y: map.year, m: map.month, d: map.day };
}

function addDays({ y, m, d }: Ymd, n: number): Ymd {
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function weekdayOf({ y, m, d }: Ymd): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymdKey({ y, m, d }: Ymd): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Generate bookable slots for `days` calendar days starting today (org tz),
 * excluding non-working days, blocked dates, past slots, and any slot that
 * overlaps a busy interval (the attendee's existing meetings).
 */
export function generateAvailableSlots(
  settings: AvailabilitySettings,
  opts: { days?: number; now?: Date; busy?: BusyInterval[] } = {}
): DaySlots[] {
  const now = opts.now ?? new Date();
  const days = opts.days ?? 14;
  const busy = opts.busy ?? [];
  const {
    workingDays,
    workingHoursStart,
    workingHoursEnd,
    timezone,
    slotDurationMinutes,
    blockedDates,
  } = settings;

  if (!slotDurationMinutes || workingHoursEnd <= workingHoursStart) return [];

  // Blocked dates keyed by their UTC calendar date (owner sets whole days).
  const blockedKeys = new Set(
    (blockedDates || []).map((bd) =>
      ymdKey({ y: bd.getUTCFullYear(), m: bd.getUTCMonth() + 1, d: bd.getUTCDate() })
    )
  );

  const today = ymdInTz(now, timezone);
  const result: DaySlots[] = [];

  for (let i = 0; i < days; i++) {
    const day = addDays(today, i);
    const weekday = weekdayOf(day);
    if (!workingDays.includes(weekday)) continue;
    if (blockedKeys.has(ymdKey(day))) continue;

    const slots: Slot[] = [];
    for (
      let start = workingHoursStart;
      start + slotDurationMinutes <= workingHoursEnd;
      start += slotDurationMinutes
    ) {
      const startUtc = zonedWallTimeToUtc(day.y, day.m, day.d, start, timezone);
      const endUtc = zonedWallTimeToUtc(day.y, day.m, day.d, start + slotDurationMinutes, timezone);

      if (startUtc <= now) continue; // past
      if (busy.some((b) => overlaps(startUtc, endUtc, b.start, b.end))) continue; // attendee busy

      slots.push({ start: startUtc.toISOString(), end: endUtc.toISOString() });
    }

    if (slots.length > 0) {
      result.push({ date: ymdKey(day), weekday, slots });
    }
  }

  return result;
}

/** Validate that a requested slot is legitimately bookable (server-side guard). */
export function isSlotBookable(
  settings: AvailabilitySettings,
  startIso: string,
  endIso: string,
  busy: BusyInterval[],
  now: Date = new Date()
): boolean {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  if (start <= now) return false;

  const dayList = generateAvailableSlots(settings, { days: 60, now, busy });
  return dayList.some((d) => d.slots.some((s) => s.start === start.toISOString() && s.end === end.toISOString()));
}
