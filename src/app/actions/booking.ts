'use server';

import { prisma } from '@/lib/db';
import { getOrCreateOrgSettings } from './availability';
import {
  generateAvailableSlots,
  isSlotBookable,
  type AvailabilitySettings,
  type BusyInterval,
} from '@/lib/planner/availability';
import { createCalendarMeetEvent, googleConfigured } from '@/lib/google/calendar';

/**
 * PUBLIC booking actions — called from the unauthenticated /book pages.
 * Google Calendar/Meet creation + reminders are added in Phase 2 / Phase 3;
 * for now these persist the Meeting row and do the availability/conflict guard.
 */

function toAvailability(s: {
  workingDays: number[];
  workingHoursStart: number;
  workingHoursEnd: number;
  timezone: string;
  slotDurationMinutes: number;
  blockedDates: Date[];
}): AvailabilitySettings {
  return {
    workingDays: s.workingDays,
    workingHoursStart: s.workingHoursStart,
    workingHoursEnd: s.workingHoursEnd,
    timezone: s.timezone,
    slotDurationMinutes: s.slotDurationMinutes,
    blockedDates: s.blockedDates,
  };
}

/** All future SCHEDULED meetings for this attendee, across ANY project they're PM on. */
async function attendeeBusyIntervals(pmId: string): Promise<BusyInterval[]> {
  const meetings = await prisma.meeting.findMany({
    where: { pmId, status: 'SCHEDULED', endTime: { gt: new Date() } },
    select: { startTime: true, endTime: true },
  });
  return meetings.map((m) => ({ start: m.startTime, end: m.endTime }));
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * Best-effort: create a Google Calendar event with a Meet link for this meeting
 * and store the link/event id. Never throws — a Google failure must not break
 * the booking (the meeting row already exists).
 */
async function attachGoogleMeet(
  meetingId: string,
  settings: { googleRefreshToken: string | null; timezone: string },
  event: { summary: string; description?: string; startIso: string; endIso: string; attendeeEmails: string[] }
): Promise<string | null> {
  if (!googleConfigured() || !settings.googleRefreshToken) return null;
  try {
    const { eventId, meetLink } = await createCalendarMeetEvent({
      refreshToken: settings.googleRefreshToken,
      summary: event.summary,
      description: event.description,
      startIso: event.startIso,
      endIso: event.endIso,
      timezone: settings.timezone,
      attendeeEmails: event.attendeeEmails,
    });
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { meetLink, googleEventId: eventId },
    });
    return meetLink;
  } catch (e: any) {
    console.error('[booking] Google Meet creation failed:', e?.message || e);
    return null;
  }
}

/** Resolve an organization from the ?org= param (accepts slug or id). */
async function resolveOrg(orgParam: string) {
  return prisma.organization.findFirst({
    where: { OR: [{ slug: orgParam }, { id: orgParam }] },
    select: { id: true, name: true, ownerUserId: true },
  });
}

// ---------------------------------------------------------------------------
// Slot listing (public)
// ---------------------------------------------------------------------------

export async function getProjectSlotsAction(projectSlug: string, days = 14) {
  const project = await prisma.project.findUnique({
    where: { slug: projectSlug },
    select: {
      id: true,
      name: true,
      organizationId: true,
      projectManagerId: true,
      projectManager: { select: { id: true, name: true } },
    },
  });
  if (!project) return { error: 'Booking link not found.' };
  if (!project.projectManagerId) {
    return { error: 'This project has no project manager assigned yet.' };
  }

  const settings = await getOrCreateOrgSettings(project.organizationId);
  const busy = await attendeeBusyIntervals(project.projectManagerId);
  const days_ = generateAvailableSlots(toAvailability(settings), { days, busy });

  return {
    success: true,
    projectName: project.name,
    attendeeName: project.projectManager?.name || null,
    timezone: settings.timezone,
    slotDurationMinutes: settings.slotDurationMinutes,
    days: days_,
  };
}

export async function getLeadSlotsAction(orgParam: string, days = 14) {
  const org = await resolveOrg(orgParam);
  if (!org) return { error: 'Booking link not found.' };

  const settings = await getOrCreateOrgSettings(org.id, org.ownerUserId || undefined);
  const attendeeId = settings.defaultIntroCallAttendeeId || org.ownerUserId;
  if (!attendeeId) return { error: 'No intro-call host is configured.' };

  const busy = await attendeeBusyIntervals(attendeeId);
  const days_ = generateAvailableSlots(toAvailability(settings), { days, busy });

  return {
    success: true,
    orgName: org.name,
    timezone: settings.timezone,
    slotDurationMinutes: settings.slotDurationMinutes,
    days: days_,
  };
}

// ---------------------------------------------------------------------------
// Booking (public)
// ---------------------------------------------------------------------------

export async function bookProjectMeetingAction(input: {
  projectSlug: string;
  startIso: string;
  endIso: string;
  note?: string;
}) {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: input.projectSlug },
      select: {
        id: true,
        name: true,
        organizationId: true,
        projectManagerId: true,
        clientId: true,
        projectManager: { select: { email: true } },
        client: { select: { email: true } },
      },
    });
    if (!project) return { error: 'Booking link not found.' };
    if (!project.projectManagerId) return { error: 'This project has no project manager assigned.' };

    const settings = await getOrCreateOrgSettings(project.organizationId);
    const busy = await attendeeBusyIntervals(project.projectManagerId);
    if (!isSlotBookable(toAvailability(settings), input.startIso, input.endIso, busy)) {
      return { error: 'That slot is no longer available. Please pick another time.' };
    }

    const meeting = await prisma.meeting.create({
      data: {
        organizationId: project.organizationId,
        projectId: project.id,
        pmId: project.projectManagerId,
        clientId: project.clientId,
        startTime: new Date(input.startIso),
        endTime: new Date(input.endIso),
        status: 'SCHEDULED',
        leadNote: input.note || null,
      },
    });

    const meetLink = await attachGoogleMeet(meeting.id, settings, {
      summary: `Meeting — ${project.name}`,
      description: input.note || undefined,
      startIso: input.startIso,
      endIso: input.endIso,
      attendeeEmails: [project.projectManager?.email, project.client?.email].filter(Boolean) as string[],
    });

    return { success: true, meetingId: meeting.id, meetLink };
  } catch (error: any) {
    return { error: error.message || 'Failed to book meeting.' };
  }
}

export async function bookLeadMeetingAction(input: {
  org: string;
  startIso: string;
  endIso: string;
  name: string;
  email: string;
  company?: string;
  note?: string;
}) {
  try {
    const name = (input.name || '').trim();
    const email = (input.email || '').trim().toLowerCase();
    if (!name) return { error: 'Please enter your name.' };
    if (!isEmail(email)) return { error: 'Please enter a valid email.' };

    const org = await resolveOrg(input.org);
    if (!org) return { error: 'Booking link not found.' };

    const settings = await getOrCreateOrgSettings(org.id, org.ownerUserId || undefined);
    const attendeeId = settings.defaultIntroCallAttendeeId || org.ownerUserId;
    if (!attendeeId) return { error: 'No intro-call host is configured.' };

    const attendee = await prisma.user.findUnique({
      where: { id: attendeeId },
      select: { email: true },
    });

    const busy = await attendeeBusyIntervals(attendeeId);
    if (!isSlotBookable(toAvailability(settings), input.startIso, input.endIso, busy)) {
      return { error: 'That slot is no longer available. Please pick another time.' };
    }

    // Match or create the lead by email within this org.
    let lead = await prisma.lead.findFirst({
      where: { organizationId: org.id, email },
      select: { id: true },
    });
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId: org.id,
          name,
          email,
          company: input.company?.trim() || null,
          note: input.note?.trim() || null,
          status: 'NEW',
        },
        select: { id: true },
      });
    }

    const meeting = await prisma.meeting.create({
      data: {
        organizationId: org.id,
        projectId: null,
        pmId: attendeeId,
        clientId: null,
        leadId: lead.id,
        leadName: name,
        leadEmail: email,
        leadCompany: input.company?.trim() || null,
        leadNote: input.note?.trim() || null,
        startTime: new Date(input.startIso),
        endTime: new Date(input.endIso),
        status: 'SCHEDULED',
      },
    });

    const meetLink = await attachGoogleMeet(meeting.id, settings, {
      summary: `Intro call — ${name}${input.company ? ` (${input.company})` : ''}`,
      description: input.note?.trim() || undefined,
      startIso: input.startIso,
      endIso: input.endIso,
      attendeeEmails: [attendee?.email, email].filter(Boolean) as string[],
    });

    return { success: true, meetingId: meeting.id, meetLink };
  } catch (error: any) {
    return { error: error.message || 'Failed to book meeting.' };
  }
}
