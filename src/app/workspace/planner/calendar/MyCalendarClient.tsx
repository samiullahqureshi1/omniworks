'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DndContext, PointerSensor, useSensor, useSensors, useDraggable, useDroppable, type DragEndEvent,
} from '@dnd-kit/core';
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiVideo,
  FiBell,
  FiClock,
  FiCheckSquare,
  FiX,
  FiExternalLink,
  FiEdit3,
} from 'react-icons/fi';
import {
  HiOutlineFolder,
  HiOutlineSwitchHorizontal,
} from 'react-icons/hi';
import { Loader2 } from 'lucide-react';
import { getPlannerCalendarAction, rescheduleTaskAction, type CalendarItem } from '@/app/actions/planner';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function pad(n: number) { return String(n).padStart(2, '0'); }
function localKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function keyFromIso(iso: string) { return localKey(new Date(iso)); }

function monthMatrix(view: Date) {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // Sunday-first: 0 = Sun, 1 = Mon...
  const start = new Date(year, month, 1 - startOffset);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  return days;
}

const CHIP_STYLES: Record<CalendarItem['kind'], string> = {
  project: 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd] dark:bg-[#0369a1]/30 dark:text-[#38bdf8] dark:border-[#0284c7]/40',
  task: 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0] dark:bg-[#15803d]/30 dark:text-[#4ade80] dark:border-[#16a34a]/40',
  event: 'bg-[#f3e8ff] text-[#7e22ce] border-[#e9d5ff] dark:bg-[#7e22ce]/30 dark:text-[#c084fc] dark:border-[#9333ea]/40',
  meeting: 'bg-[#dbeafe] text-[#1d4ed8] border-[#bfdbfe] dark:bg-[#1d4ed8]/30 dark:text-[#60a5fa] dark:border-[#2563eb]/40',
  reminder: 'bg-[#fef3c7] text-[#b45309] border-[#fde68a] dark:bg-[#b45309]/30 dark:text-[#fbbf24] dark:border-[#d97706]/40',
};

function ChipIcon({ kind }: { kind: CalendarItem['kind'] }) {
  if (kind === 'project') return <HiOutlineFolder size={12} className="shrink-0" />;
  if (kind === 'task') return <FiCheck size={12} className="shrink-0 stroke-[2.5]" />;
  if (kind === 'event') return <HiOutlineSwitchHorizontal size={12} className="shrink-0" />;
  if (kind === 'meeting') return <FiVideo size={12} className="shrink-0" />;
  return <FiBell size={12} className="shrink-0" />;
}

function TaskChip({
  item,
  draggable,
  onClick,
}: {
  item: CalendarItem;
  draggable: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id, disabled: !draggable });
  return (
    <div
      ref={setNodeRef}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-[11px] font-bold border shadow-2xs truncate transition-all cursor-pointer hover:opacity-85 ${
        CHIP_STYLES[item.kind] || 'bg-slate-100 text-slate-700 border-slate-200'
      } ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''}`}
      title={item.kind === 'project' ? `${item.title} (project due)` : item.title}
    >
      <ChipIcon kind={item.kind} />
      <span className="truncate">{item.title}</span>
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  isToday,
  items,
  canReschedule,
  onItemClick,
}: {
  day: Date;
  inMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
  canReschedule: boolean;
  onItemClick: (item: CalendarItem) => void;
}) {
  const key = localKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: key });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] p-2 flex flex-col gap-1.5 transition-colors ${
        inMonth ? 'bg-white dark:bg-[#151518]' : 'bg-slate-50/50 dark:bg-white/[0.01]'
      } ${isOver ? 'ring-2 ring-inset ring-slate-400 dark:ring-white/30' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-black ${
          isToday
            ? 'h-6 w-6 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs'
            : inMonth
            ? 'text-slate-800 dark:text-slate-200'
            : 'text-slate-300 dark:text-slate-600'
        }`}>
          {day.getDate()}
        </span>
      </div>
      <div className="flex flex-col gap-1 overflow-hidden">
        {items.slice(0, 4).map((it) => (
          <TaskChip
            key={it.id}
            item={it}
            draggable={canReschedule && !!it.draggable}
            onClick={() => onItemClick(it)}
          />
        ))}
        {items.length > 4 && (
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1">
            +{items.length - 4} more
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyCalendarClient({ mode }: { mode?: 'all' | 'plannerOnly' }) {
  const router = useRouter();
  const [view, setView] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [canReschedule, setCanReschedule] = useState(false);
  const [userRole, setUserRole] = useState<string>('MEMBER');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'project' | 'task' | 'event' | 'meeting' | 'reminder'>('all');
  const [selectedItem, setSelectedItem] = useState<CalendarItem | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const days = useMemo(() => monthMatrix(view), [view]);

  const isMainCalendar = mode ? mode === 'all' : (typeof window !== 'undefined' && window.location.pathname.startsWith('/workspace/calendar'));
  const currentMode = isMainCalendar ? 'all' : 'plannerOnly';
  const isOwner = userRole === 'OWNER' || userRole === 'MASTER_ADMIN';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const from = new Date(view.getFullYear(), view.getMonth(), 1 - 7);
      const to = new Date(view.getFullYear(), view.getMonth() + 1, 7);
      const res = await getPlannerCalendarAction(from.toISOString(), to.toISOString(), currentMode);
      if (cancelled) return;
      if (res.success) {
        setItems(res.items!);
        setCanReschedule(!!res.canReschedule);
        if (res.userRole) setUserRole(res.userRole);
      } else {
        toast.error(res.error || 'Failed to load calendar');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [view, currentMode]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'all') return items;
    return items.filter((it) => it.kind === categoryFilter);
  }, [items, categoryFilter]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of filteredItems) {
      const k = keyFromIso(it.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.date.localeCompare(b.date));
    return map;
  }, [filteredItems]);

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

  const handleChipClick = (item: CalendarItem) => {
    // If Meeting chip is clicked by Owner or Member, navigate directly to meetings
    if (item.kind === 'meeting') {
      router.push('/workspace/planner/meetings');
      return;
    }
    // Set selected item to open modal
    setSelectedItem(item);
  };

  const monthLabel = view.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const todayKey = localKey(new Date());

  return (
    <div className="w-full flex flex-col gap-5 p-2 md:p-4">
      {/* Header Bar */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-[8px] bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-sm shrink-0">
          <FiCalendar size={22} />
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold font-black tracking-tight text-slate-900 dark:text-white">
          {isMainCalendar ? 'Workspace Calendar' : 'My Calendar'}
        </h1>
      </div>

      {/* Controls Bar: Filter Pills + Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Filter Pills Container */}
        <div className="bg-slate-100/80 dark:bg-[#1a1a1e] p-1.5 rounded-[8px] flex flex-wrap items-center gap-1 border border-slate-200/60 dark:border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-1.5 rounded-[8px] text-xs font-bold transition-all ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All
          </button>
          
          {isMainCalendar && (
            <>
              <button
                type="button"
                onClick={() => setCategoryFilter('project')}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                  categoryFilter === 'project'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <HiOutlineFolder size={14} className="shrink-0 text-amber-500" />
                <span>Projects</span>
              </button>

              <button
                type="button"
                onClick={() => setCategoryFilter('task')}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
                  categoryFilter === 'task'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FiCheckSquare size={13} className="shrink-0 text-emerald-500" />
                <span>Tasks</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setCategoryFilter('event')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              categoryFilter === 'event'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <HiOutlineSwitchHorizontal size={14} className="shrink-0 text-purple-500" />
            <span>Events</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('meeting')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              categoryFilter === 'meeting'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FiVideo size={13} className="shrink-0 text-blue-500" />
            <span>Meetings</span>
          </button>

          <button
            type="button"
            onClick={() => setCategoryFilter('reminder')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              categoryFilter === 'reminder'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FiBell size={13} className="shrink-0 text-amber-500" />
            <span>Reminders</span>
          </button>
        </div>

        {/* Date Navigation & Month Display */}
        <div className="flex items-center gap-4">
          {loading && <Loader2 size={16} className="animate-spin text-slate-400" />}
          
          {/* Navigation Controls Box */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-[#1a1a1e] border border-slate-200/60 dark:border-white/10 rounded-[8px] p-1 px-2.5">
            <button
              type="button"
              onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Previous Month"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setView(new Date())}
              className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-white/10 rounded-[8px] transition-all"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Next Month"
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          <div className="text-xl md:text-2xl font-semibold font-black text-slate-900 dark:text-white min-w-[150px]">
            {monthLabel}
          </div>
        </div>
      </div>

      {/* Main Calendar Grid Card */}
      <div className="rounded-[8px] border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-[#151518] shadow-xs">
        {/* Weekday Headers (SUN to SAT) */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-white/[0.02]">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-3 text-center text-xs font-black text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              {w}
            </div>
          ))}
        </div>

        {/* Calendar Cells Grid */}
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800/80">
            {days.map((day, i) => (
              <DayCell
                key={i}
                day={day}
                inMonth={day.getMonth() === view.getMonth()}
                isToday={localKey(day) === todayKey}
                items={byDay.get(localKey(day)) || []}
                canReschedule={canReschedule}
                onItemClick={handleChipClick}
              />
            ))}
          </div>
        </DndContext>
      </div>

      {/* Footer Caption */}
      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
        {isMainCalendar
          ? (canReschedule ? 'Drag a task to another day to reschedule its due date. Displaying all workspace projects, tasks, events, reminders, and meetings.' : 'Displaying all workspace projects, tasks, events, reminders, and meetings.')
          : 'Events, reminders, and meetings scheduled for your organization.'}
      </p>

      {/* ITEM DETAILS / EDITION MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#1f1f23] rounded-[8px] shadow-xl border border-slate-100 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col max-h-[85vh] relative z-50">
            {/* Fixed Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between z-20 bg-white dark:bg-[#1f1f23]">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-[8px] text-xs font-bold flex items-center gap-1.5 border ${
                  CHIP_STYLES[selectedItem.kind]
                }`}>
                  <ChipIcon kind={selectedItem.kind} />
                  <span className="capitalize">{selectedItem.kind}</span>
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  {isOwner ? 'Edition & Details' : 'Details'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-[8px] transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug">
                {selectedItem.title}
              </h3>

              {/* Info Card with rounded-[8px] */}
              <div className="space-y-2.5 bg-slate-50/70 dark:bg-[#151515] p-4 rounded-[8px] border border-slate-200/80 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-500 dark:text-slate-400">Date</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {new Date(selectedItem.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {selectedItem.end && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 dark:text-slate-400">End Time</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {new Date(selectedItem.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}

                {selectedItem.meta && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 dark:text-slate-400">
                      {selectedItem.kind === 'meeting' ? 'Platform' : 'Project'}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedItem.meta}
                    </span>
                  </div>
                )}

                {selectedItem.status && (
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-500 dark:text-slate-400">Status</span>
                    <span className="font-bold px-2 py-0.5 rounded-[8px] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                      {selectedItem.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-end gap-3 bg-white dark:bg-[#1f1f23] z-30 relative shadow-sm">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-5 py-2 h-8 rounded-[8px] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 bg-transparent font-semibold text-xs transition-all"
              >
                Close
              </button>

              {/* Owner Edition & Direct Action Buttons */}
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => {
                    const href = selectedItem.href || '/workspace';
                    setSelectedItem(null);
                    router.push(href);
                  }}
                  className="px-5 py-2 h-8 rounded-[8px] bg-[#16181a] dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <FiEdit3 size={13} />
                  <span>
                    {selectedItem.kind === 'task' && 'Edit Task'}
                    {selectedItem.kind === 'project' && 'Edit Project'}
                    {selectedItem.kind === 'event' && 'Edit Event'}
                    {selectedItem.kind === 'meeting' && 'Go to Meeting'}
                    {selectedItem.kind === 'reminder' && 'View Reminder'}
                  </span>
                </button>
              ) : (
                selectedItem.href && (
                  <button
                    type="button"
                    onClick={() => {
                      const href = selectedItem.href || '/workspace';
                      setSelectedItem(null);
                      router.push(href);
                    }}
                    className="px-5 py-2 h-8 rounded-[8px] bg-[#16181a] dark:bg-white text-white dark:text-slate-900 font-bold text-xs hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <FiExternalLink size={13} />
                    <span>View Page</span>
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
