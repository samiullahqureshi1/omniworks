'use server';

import { prisma } from '@/lib/db';
import { getSession, type UserSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { analyzeTranscript, geminiConfigured } from '@/lib/google/gemini';
import { fetchMeetTranscriptText } from '@/lib/google/meet';
import { createTaskAction } from './tasks';

type MeetingRow = {
  id: string;
  organizationId: string;
  pmId: string;
  clientId: string | null;
  projectId: string | null;
};

function canAccessMeeting(session: UserSession, m: MeetingRow): boolean {
  if (m.organizationId !== session.organizationId) return false;
  if (session.role === 'OWNER') return true;
  if (m.pmId === session.userId) return true;
  if (m.clientId && m.clientId === session.userId) return true;
  return false;
}

function canManageMeeting(session: UserSession, m: MeetingRow): boolean {
  if (m.organizationId !== session.organizationId) return false;
  return session.role === 'OWNER' || m.pmId === session.userId;
}

export async function getMeetingWithNotesAction(meetingId: string) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        note: true,
        pm: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!meeting) return { error: 'Meeting not found.' };
    if (!canAccessMeeting(session, meeting)) return { error: 'Access denied.' };

    return { success: true, meeting, canManage: canManageMeeting(session, meeting) };
  } catch (error: any) {
    return { error: error.message || 'Failed to load meeting.' };
  }
}

/**
 * Generate structured notes for a meeting. If `transcriptText` is provided
 * (PM pasted/uploaded notes) it is used and marked MANUAL. Otherwise we attempt
 * a best-effort Meet transcript fetch (Workspace only); if none is found the
 * note is marked UNAVAILABLE so the UI can prompt for manual entry.
 */
export async function analyzeMeetingAction(input: { meetingId: string; transcriptText?: string }) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (!geminiConfigured()) return { error: 'Gemini is not configured on the server (GEMINI_API_KEY).' };

    const meeting = await prisma.meeting.findUnique({
      where: { id: input.meetingId },
      select: { id: true, organizationId: true, pmId: true, clientId: true, projectId: true, startTime: true, meetLink: true },
    });
    if (!meeting) return { error: 'Meeting not found.' };
    if (!canManageMeeting(session, meeting)) return { error: 'Only the meeting host or an owner can generate notes.' };

    let transcript = input.transcriptText?.trim() || '';
    let source: 'MANUAL' | 'AVAILABLE' = 'MANUAL';

    if (!transcript) {
      // Try to auto-fetch a Meet transcript (best-effort).
      const settings = await prisma.organizationSettings.findUnique({
        where: { organizationId: meeting.organizationId },
        select: { googleRefreshToken: true },
      });
      if (settings?.googleRefreshToken) {
        const fetched = await fetchMeetTranscriptText({
          refreshToken: settings.googleRefreshToken,
          startTime: meeting.startTime,
          meetLink: meeting.meetLink,
        });
        if (fetched) {
          transcript = fetched;
          source = 'AVAILABLE';
        }
      }
    }

    if (!transcript) {
      await prisma.meetingNote.upsert({
        where: { meetingId: meeting.id },
        create: { meetingId: meeting.id, transcriptStatus: 'UNAVAILABLE' },
        update: { transcriptStatus: 'UNAVAILABLE' },
      });
      return { error: 'No transcript available yet. Paste the meeting notes/transcript to analyze manually.' };
    }

    const analysis = await analyzeTranscript(transcript);

    const note = await prisma.meetingNote.upsert({
      where: { meetingId: meeting.id },
      create: {
        meetingId: meeting.id,
        summary: analysis.summary,
        keyPoints: analysis.key_points,
        actionItems: analysis.action_items as any,
        notes: analysis.notes,
        transcriptStatus: source,
      },
      update: {
        summary: analysis.summary,
        keyPoints: analysis.key_points,
        actionItems: analysis.action_items as any,
        notes: analysis.notes,
        transcriptStatus: source,
      },
    });

    revalidatePath('/workspace/planner/meetings');
    return { success: true, note };
  } catch (error: any) {
    return { error: error.message || 'Failed to analyze meeting.' };
  }
}

export async function saveManualNotesAction(input: {
  meetingId: string;
  summary?: string;
  notes?: string;
}) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const meeting = await prisma.meeting.findUnique({
      where: { id: input.meetingId },
      select: { id: true, organizationId: true, pmId: true, clientId: true, projectId: true },
    });
    if (!meeting) return { error: 'Meeting not found.' };
    if (!canManageMeeting(session, meeting)) return { error: 'Only the meeting host or an owner can edit notes.' };

    const note = await prisma.meetingNote.upsert({
      where: { meetingId: meeting.id },
      create: {
        meetingId: meeting.id,
        summary: input.summary ?? null,
        notes: input.notes ?? null,
        transcriptStatus: 'MANUAL',
      },
      update: {
        ...(input.summary !== undefined ? { summary: input.summary } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
      },
    });

    revalidatePath('/workspace/planner/meetings');
    return { success: true, note };
  } catch (error: any) {
    return { error: error.message || 'Failed to save notes.' };
  }
}

/** Convert an AI action item into a real Task in the meeting's project. */
export async function createTaskFromActionItemAction(input: {
  meetingId: string;
  text: string;
  dueDateGuess?: string | null;
  assigneeIds?: string[];
}) {
  try {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };

    const meeting = await prisma.meeting.findUnique({
      where: { id: input.meetingId },
      select: { id: true, organizationId: true, pmId: true, clientId: true, projectId: true },
    });
    if (!meeting) return { error: 'Meeting not found.' };
    if (!canManageMeeting(session, meeting)) return { error: 'Only the meeting host or an owner can create tasks.' };
    if (!meeting.projectId) {
      return { error: 'This meeting is not linked to a project. Convert the lead to a project first.' };
    }

    // Only pass a due date if it looks like a real ISO date.
    const due = input.dueDateGuess && /^\d{4}-\d{2}-\d{2}/.test(input.dueDateGuess)
      ? input.dueDateGuess.slice(0, 10)
      : undefined;

    const res = await createTaskAction(
      meeting.projectId,
      input.text.trim(),
      undefined,
      'MEDIUM',
      undefined,
      due,
      undefined,
      input.assigneeIds || [],
    );

    if ((res as any).error) return { error: (res as any).error };
    return { success: true, task: (res as any).task };
  } catch (error: any) {
    return { error: error.message || 'Failed to create task.' };
  }
}
