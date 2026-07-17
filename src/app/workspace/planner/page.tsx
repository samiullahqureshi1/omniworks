import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CalendarDays, Video, Sparkles, Timer } from 'lucide-react';
import PlannerConnectGate from './PlannerConnectGate';

export default async function PlannerPage() {
  const session = await getSession();
  if (!session) redirect('/login');

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: session.organizationId },
    select: { googleRefreshToken: true },
  });
  const connected = !!settings?.googleRefreshToken;

  if (!connected) {
    return <PlannerConnectGate isOwner={session.role === 'OWNER'} />;
  }

  // Connected: normal Planner home (the secondary sidebar returns via the layout).
  const sections = [
    { name: 'My Calendar', icon: CalendarDays, desc: 'Your tasks and meetings in one view.' },
    { name: 'Meetings', icon: Video, desc: 'Bookings, Meet links, and AI notes.' },
    { name: 'Events', icon: Sparkles, desc: 'Milestones and org events.' },
    { name: 'Reminders', icon: Timer, desc: 'Upcoming deadlines and calls.' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Planner</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
        Your calendar is connected. Pick a section from the sidebar to get started.
      </p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((s) => (
          <div
            key={s.name}
            className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1f1f1f] p-5 flex items-start gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <s.icon size={18} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
