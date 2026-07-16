import React from 'react';
import { getProjectSlotsAction } from '@/app/actions/booking';
import BookingWidget from '../BookingWidget';

export default async function ProjectBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const res = await getProjectSlotsAction(slug);

  if (!res.success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0c0c0e]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Booking unavailable</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{res.error}</p>
        </div>
      </div>
    );
  }

  return (
    <BookingWidget
      mode="project"
      identifier={slug}
      title={res.projectName || 'Book a meeting'}
      subtitle="Schedule a call with your project manager."
      attendeeName={res.attendeeName}
      timezone={res.timezone!}
      slotDurationMinutes={res.slotDurationMinutes!}
      initialDays={res.days!}
    />
  );
}
