'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent,
} from '@dnd-kit/core';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Loader2, Video, CheckSquare, FolderKanban } from 'lucide-react';
import { getPlannerCalendarAction, rescheduleTaskAction, type CalendarItem } from '@/app/actions/planner';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function localKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function keyFromIso(iso: string) { return localKey(new Date(iso)); }

function monthMatrix(view: Date) {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const start = new Date(year, month, 1 - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

const CHIP_STYLES: Record<CalendarItem['kind'], string> = {
  meeting: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  project: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  task: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
};

function ChipIcon({ kind }: { kind: CalendarItem['kind'] }) {
  if (kind === 'meeting') return <Video size={11} className="shrink-0" />;
  if (kind === 'project') return <FolderKanban size={11} className="shrink-0" />;
  return <CheckSquare size={11} className="shrink-0" />;
}

function TaskChip({ item, draggable }: { item: CalendarItem; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: !draggable });
  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium truncate ${
        CHIP_STYLES[item.kind]
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''}`}
      title={item.kind === 'project' ? `${item.title} (project due)` : item.title}
    >
      <ChipIcon kind={item.kind} />
      <span className="truncate">{item.title}</span>
    </div>
  );
}

function DayCell({ day, inMonth, isToday, items, canReschedule }: {
  day: Date; inMonth: boolean; isToday: boolean; items: CalendarItem[]; canReschedule: boolean;
}) {
  const key = localKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: key });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[92px] border-b border-r border-slate-100 dark:border-white/5 p-1.5 flex flex-col gap-1 ${
        inMonth ? 'bg-white dark:bg-[#1f1f1f]' : 'bg-slate-50/60 dark:bg-white/[0.02]'
      } ${isOver ? 'ring-2 ring-inset ring-slate-400 dark:ring-white/30' : ''}`}
    >
      <div className={`text-[11px] font-semibold ${isToday ? 'h-5 w-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center' : inMonth ? 'text-slate-500 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
        {day.getDate()}
      </div>
      <div className="flex flex-col gap-1 overflow-hidden">
        {items.slice(0, 4).map((it) => (
          <TaskChip key={it.id} item={it} draggable={canReschedule && !!it.draggable} />
        ))}
        {items.length > 4 && <div className="text-[10px] text-slate-400 dark:text-slate-500 px-1">+{items.length - 4} more</div>}
      </div>
    </div>
  );
}

export default function MyCalendarClient() {
  const router = useRouter();
  const [view, setView] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReschedule, setCanReschedule] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const days = useMemo(() => monthMatrix(view), [view]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = new Date(view.getFullYear(), view.getMonth(), 1 - 7);
      const to = new Date(view.getFullYear(), view.getMonth() + 1, 7);
      const res = await getPlannerCalendarAction(from.toISOString(), to.toISOString());
      if (cancelled) return;
      if (res.success) { setItems(res.items!); setCanReschedule(!!res.canReschedule); }
      else toast.error(res.error || 'Failed to load calendar');
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [view]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const k = keyFromIso(it.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [items]);

  const onDragEnd = async (e: DragEndEvent) => {
    const overKey = e.over?.id as string | undefined;
    const activeId = e.active?.id as string | undefined;
    if (!overKey || !activeId) return;
    const item = items.find((i) => i.id === activeId);
    if (!item || !item.draggable || item.kind !== 'task') return;
    if (keyFromIso(item.date) === overKey) return;

    const [y, m, d] = overKey.split('-').map(Number);
    const orig = new Date(item.date);
    const next = new Date(y, m - 1, d, orig.getHours(), orig.getMinutes());
    const prev = items;
    setItems((list) => list.map((i) => (i.id === activeId ? { ...i, date: next.toISOString() } : i)));

    const taskId = activeId.replace('task-', '');
    const res = await rescheduleTaskAction(taskId, next.toISOString());
    if (res.error) { setItems(prev); toast.error(res.error); }
    else toast.success('Task rescheduled');
  };

  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = localKey(new Date());

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <CalIcon className="text-slate-500" size={22} /> My Calendar
        </h1>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          <button type="button" onClick={() => setView(new Date())} className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">Today</button>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))} className="h-9 w-9 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"><ChevronLeft size={18} /></button>
            <div className="min-w-[150px] text-center text-sm font-bold text-slate-900 dark:text-white">{monthLabel}</div>
            <button type="button" onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))} className="h-9 w-9 rounded-lg border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"><ChevronRight size={18} /></button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 dark:bg-white/5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-white/5 last:border-r-0">{w}</div>
          ))}
        </div>
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-7">
            {days.map((day, i) => (
              <DayCell
                key={i}
                day={day}
                inMonth={day.getMonth() === view.getMonth()}
                isToday={localKey(day) === todayKey}
                items={byDay.get(localKey(day)) || []}
                canReschedule={canReschedule}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
        {canReschedule ? 'Drag a task to another day to reschedule its due date.' : 'Tasks and meetings assigned to you. Rescheduling is available to owners and project managers.'}
      </p>
    </div>
  );
}
