import React from 'react';
import { getLeadSlotsAction } from '@/app/actions/booking';
import BookingWidget from './BookingWidget';

export default async function GeneralBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#0c0c0e]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Booking link incomplete</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            This booking link is missing its organization. Please use the full link shared with you.
          </p>
        </div>
      </div>
    );
  }

  const res = await getLeadSlotsAction(org, 60);

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
      mode="lead"
      identifier={org}
      title={org === 'the-smith-marketing-4878' ? '15-Minute Plumbing Lead System Call' : `${res.slotDurationMinutes}-Minute Intro Call`}
      attendeeName={res.attendeeName || res.orgName}
      timezone={res.timezone!}
      slotDurationMinutes={res.slotDurationMinutes!}
      initialDays={res.days!}
    />
  );
}
