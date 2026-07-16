'use server';

import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Fetch the org's availability settings, creating a default row on first access.
 * Defaults: Mon–Fri, 10:00–17:00, UTC, 30-min slots, intro-call host = owner.
 */
export async function getOrCreateOrgSettings(organizationId: string, ownerFallbackId?: string) {
  const existing = await prisma.organizationSettings.findUnique({
    where: { organizationId },
  });
  if (existing) return existing;

  return prisma.organizationSettings.create({
    data: {
      organizationId,
      defaultIntroCallAttendeeId: ownerFallbackId ?? null,
    },
  });
}

export async function getAvailabilitySettingsAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const settings = await getOrCreateOrgSettings(session.organizationId, session.userId);

    // Members who can host intro calls (owners + members, not clients)
    const hosts = await prisma.user.findMany({
      where: { organizationId: session.organizationId, status: 'ACTIVE', role: { in: ['OWNER', 'MEMBER'] } },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    });

    return { success: true, settings, hosts };
  } catch (error: any) {
    return { error: error.message || 'Failed to load availability settings.' };
  }
}

export async function disconnectGoogleAction() {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role !== 'OWNER') return { error: 'Only owners can disconnect Google.' };

    await getOrCreateOrgSettings(session.organizationId, session.userId);
    await prisma.organizationSettings.update({
      where: { organizationId: session.organizationId },
      data: { googleRefreshToken: null, googleConnectedEmail: null },
    });

    revalidatePath('/workspace/planner/settings');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to disconnect Google.' };
  }
}

export interface UpdateAvailabilityInput {
  workingDays: number[];
  workingHoursStart: number;
  workingHoursEnd: number;
  timezone: string;
  slotDurationMinutes: number;
  blockedDates: string[]; // YYYY-MM-DD
  defaultIntroCallAttendeeId: string | null;
}

export async function updateAvailabilitySettingsAction(input: UpdateAvailabilityInput) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role !== 'OWNER') {
      return { error: 'Only owners can change availability settings.' };
    }

    // Validation
    const workingDays = (input.workingDays || []).filter((d) => d >= 0 && d <= 6);
    if (input.workingHoursEnd <= input.workingHoursStart) {
      return { error: 'Working hours end must be after start.' };
    }
    if (![15, 20, 30, 45, 60, 90, 120].includes(input.slotDurationMinutes)) {
      return { error: 'Invalid slot duration.' };
    }
    // Validate timezone
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: input.timezone });
    } catch {
      return { error: 'Invalid timezone.' };
    }

    const blockedDates = (input.blockedDates || [])
      .map((s) => new Date(`${s}T00:00:00.000Z`))
      .filter((d) => !isNaN(d.getTime()));

    let attendeeId = input.defaultIntroCallAttendeeId;
    if (attendeeId) {
      const valid = await prisma.user.findFirst({
        where: { id: attendeeId, organizationId: session.organizationId, role: { in: ['OWNER', 'MEMBER'] } },
        select: { id: true },
      });
      if (!valid) attendeeId = session.userId;
    }

    await getOrCreateOrgSettings(session.organizationId, session.userId);
    const settings = await prisma.organizationSettings.update({
      where: { organizationId: session.organizationId },
      data: {
        workingDays,
        workingHoursStart: input.workingHoursStart,
        workingHoursEnd: input.workingHoursEnd,
        timezone: input.timezone,
        slotDurationMinutes: input.slotDurationMinutes,
        blockedDates,
        defaultIntroCallAttendeeId: attendeeId,
      },
    });

    revalidatePath('/workspace/planner/settings');
    return { success: true, settings };
  } catch (error: any) {
    return { error: error.message || 'Failed to update availability settings.' };
  }
}
