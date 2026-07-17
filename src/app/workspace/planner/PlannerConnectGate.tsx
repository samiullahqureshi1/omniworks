'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function OutlookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#0364B8" d="M43 12H26v24h17a2 2 0 0 0 2-2V14a2 2 0 0 0-2-2z" />
      <path fill="#0A2767" d="M45 14l-19 12L26 14z" opacity=".4" />
      <rect x="3" y="8" width="26" height="32" rx="3" fill="#0F6CBD" />
      <text x="16" y="30" fontSize="16" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial">O</text>
    </svg>
  );
}

const SLIDES = [
  {
    key: 'time-block',
    caption: 'Time blocking',
    body: 'Drag tasks straight onto your calendar to block out focused time for what matters most.',
  },
  {
    key: 'team',
    caption: 'Team schedules',
    body: 'See calendars for anyone in your team, highlight shared free time, and schedule a call in seconds.',
  },
  {
    key: 'auto',
    caption: 'Automatic time blocking',
    body: 'AI suggests and schedules the best time for your tasks — like your own scheduling assistant.',
  },
];

/** Mock calendar card used in the preview carousel. */
function CalendarPreview({ variant }: { variant: number }) {
  const events = [
    { label: 'Design Sprint Feedback', time: '12 – 1pm', color: 'bg-blue-100 text-blue-700 border-blue-300' },
    { label: '1:1 with Dean', time: '1pm', color: 'bg-rose-100 text-rose-700 border-rose-300' },
    { label: 'Team Lunch', time: '1:30pm', color: 'bg-violet-100 text-violet-700 border-violet-300' },
    { label: 'Design System overview', time: '2 – 3pm', color: 'bg-sky-100 text-sky-700 border-sky-300' },
  ];
  return (
    <div className="rounded-2xl bg-white dark:bg-[#1f1f1f] border border-slate-200/80 dark:border-white/10 shadow-[0_20px_50px_rgba(15,23,42,0.12)] p-3 w-full">
      <div className="flex rounded-lg overflow-hidden mb-3 text-xs font-semibold">
        <div className="flex-1 text-center py-2 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">Task planning</div>
        <div className="flex-1 text-center py-2 bg-blue-600 text-white">Schedule meeting</div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          {events.slice(0, 3).map((e) => (
            <div key={e.label} className={`rounded-md border-l-4 ${e.color} px-2 py-1.5`}>
              <div className="text-[11px] font-semibold leading-tight truncate">{e.label}</div>
              <div className="text-[10px] opacity-80">{e.time}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <div className="rounded-md border border-dashed border-blue-400 text-blue-600 text-[11px] font-semibold text-center py-1.5">Book Meeting</div>
          {events.slice(3).map((e) => (
            <div key={e.label} className={`rounded-md border-l-4 ${e.color} px-2 py-1.5`}>
              <div className="text-[11px] font-semibold leading-tight truncate">{e.label}</div>
              <div className="text-[10px] opacity-80">{e.time}</div>
            </div>
          ))}
          <div className="rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 text-[11px] px-2 py-1.5">Inbox <span className="opacity-70">2:30pm</span></div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {['#f59e0b', '#ef4444', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#8b5cf6', '#14b8a6'].map((c, i) => (
          <span key={i} className="h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#1f1f1f]" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  );
}

export default function PlannerConnectGate({ isOwner }: { isOwner: boolean }) {
  const [index, setIndex] = useState(1);
  const slide = SLIDES[index];

  const connectGoogle = (e: React.MouseEvent) => {
    if (!isOwner) {
      e.preventDefault();
      toast.info('Only the workspace owner can connect Google Calendar.');
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-50 dark:bg-[#0c0c0e]">
      {/* subtle grid background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(100,116,139,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(100,116,139,0.12) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative h-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center px-6 md:px-12 lg:px-16 py-10 overflow-y-auto custom-scrollbar">
        {/* Left: hero + CTAs */}
        <div className="max-w-lg">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.05]">
            You, but better organized
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Connect your calendar to manage events, time block your work, and take meeting notes — powered by OmniWork.
          </p>

          <p className="mt-8 text-sm font-medium text-slate-400 dark:text-slate-500">Get started with</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <a
              href="/api/integrations/google/connect"
              onClick={connectGoogle}
              className="inline-flex items-center gap-3 h-12 px-5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all text-[15px] font-semibold text-slate-800 dark:text-slate-100"
            >
              <GoogleIcon /> Google Calendar
            </a>
            <button
              type="button"
              onClick={() => toast.info('Microsoft Outlook integration is coming soon.')}
              className="inline-flex items-center gap-3 h-12 px-5 rounded-xl bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-white/20 transition-all text-[15px] font-semibold text-slate-800 dark:text-slate-100"
            >
              <OutlookIcon /> Microsoft Outlook
            </button>
          </div>

          {!isOwner && (
            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
              Your workspace owner needs to connect Google Calendar to enable the Planner.
            </p>
          )}
        </div>

        {/* Right: preview carousel */}
        <div className="relative hidden lg:flex flex-col items-center">
          <div className="relative flex items-center justify-center w-full">
            <div className="absolute -left-6 w-64 scale-90 opacity-40 blur-[0.5px]">
              <CalendarPreview variant={0} />
            </div>
            <div className="absolute -right-6 w-64 scale-90 opacity-40 blur-[0.5px]">
              <CalendarPreview variant={2} />
            </div>
            <div className="relative z-10 w-[22rem]">
              <CalendarPreview variant={1} />
              <div className="mt-5 px-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{slide.caption}</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{slide.body}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-6 rounded-full bg-white dark:bg-[#1f1f1f] border border-slate-200 dark:border-white/10 shadow-sm px-4 py-2 z-20">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              aria-label="Previous"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-1.5">
              {SLIDES.map((_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-slate-800 dark:bg-white' : 'w-1.5 bg-slate-300 dark:bg-white/30'}`} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
              aria-label="Next"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
