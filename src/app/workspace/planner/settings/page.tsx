import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getAvailabilitySettingsAction } from '@/app/actions/availability';
import { googleConfigured } from '@/lib/google/calendar';
import { prisma } from '@/lib/db';
import AvailabilitySettingsClient from './AvailabilitySettingsClient';

export default async function PlannerSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const { google: googleStatus } = await searchParams;
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'OWNER') redirect('/workspace');

  const org = await prisma.organization.findUnique({
    where: { id: session.organizationId },
    select: { slug: true, id: true },
  });
  const orgParam = org?.slug || org?.id || session.organizationId;

  const res = await getAvailabilitySettingsAction();
  if (!res.success || !res.settings) {
    return (
      <div className="p-6 text-sm text-red-500">
        Failed to load availability settings{res.error ? `: ${res.error}` : ''}.
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  return (
    <AvailabilitySettingsClient
      initialSettings={{
        workingDays: res.settings.workingDays,
        workingHoursStart: res.settings.workingHoursStart,
        workingHoursEnd: res.settings.workingHoursEnd,
        timezone: res.settings.timezone,
        slotDurationMinutes: res.settings.slotDurationMinutes,
        blockedDates: res.settings.blockedDates.map((d: Date) => d.toISOString().slice(0, 10)),
        defaultIntroCallAttendeeId: res.settings.defaultIntroCallAttendeeId,
      }}
      hosts={res.hosts || []}
      appUrl={appUrl}
      orgParam={orgParam}
      googleConfigured={googleConfigured()}
      googleConnectedEmail={res.settings.googleConnectedEmail || null}
      googleStatus={googleStatus || null}
    />
  );
}
