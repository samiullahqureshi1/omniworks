import { prisma } from '@/lib/db';
import { fetchMeetTranscriptText } from '@/lib/google/meet';
import {
  analyzeTranscriptWithOpenRouter,
  openRouterConfigured,
  type MeetingAnalysis,
} from '@/lib/ai/openrouter';
import { analyzeTranscript as analyzeWithGemini, geminiConfigured } from '@/lib/google/gemini';

export type ProcessOutcome =
  | 'analyzed'      // transcript fetched, saved and summarised
  | 'saved_only'    // transcript saved but no AI provider configured / analysis failed
  | 'no_transcript' // Google has no transcript for this conference (yet)
  | 'not_connected' // organisation has not connected Google
  | 'skipped';      // already has an analysed transcript

/**
 * Runs the analysis through OpenRouter first (the configured provider), falling
 * back to Gemini if OpenRouter isn't set up. Returns null when neither is available.
 */
async function analyze(transcript: string): Promise<MeetingAnalysis | null> {
  if (openRouterConfigured()) {
    return await analyzeTranscriptWithOpenRouter(transcript);
  }
  if (geminiConfigured()) {
    return (await analyzeWithGemini(transcript)) as MeetingAnalysis;
  }
  return null;
}

/**
 * Fetches a meeting's Google Meet transcript, PERSISTS THE RAW TRANSCRIPT, then
 * generates and attaches structured notes.
 *
 * Note: the previous pipeline stored only the AI summary and silently discarded
 * `rawTranscript`, so the full discussion was never actually saved. It is now
 * written before analysis runs, so the transcript survives even if the model call
 * fails and the run is retried later.
 */
export async function processMeetingTranscript(
  meetingId: string,
  opts: { force?: boolean } = {}
): Promise<{ outcome: ProcessOutcome; error?: string }> {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    select: {
      id: true,
      organizationId: true,
      startTime: true,
      meetLink: true,
      note: { select: { transcriptStatus: true, rawTranscript: true } },
    },
  });

  if (!meeting) return { outcome: 'skipped', error: 'Meeting not found' };

  // Already done — don't burn a model call on every poll.
  if (!opts.force && meeting.note?.transcriptStatus === 'AVAILABLE') {
    return { outcome: 'skipped' };
  }

  // Track the meeting from the first attempt.
  await prisma.meetingNote.upsert({
    where: { meetingId: meeting.id },
    create: { meetingId: meeting.id, transcriptStatus: 'PENDING' },
    update: {},
  });

  const settings = await prisma.organizationSettings.findUnique({
    where: { organizationId: meeting.organizationId },
    select: { googleRefreshToken: true },
  });

  if (!settings?.googleRefreshToken) return { outcome: 'not_connected' };

  // Reuse an already-saved transcript when re-generating notes.
  let transcript = opts.force ? meeting.note?.rawTranscript ?? null : null;

  if (!transcript) {
    transcript = await fetchMeetTranscriptText({
      refreshToken: settings.googleRefreshToken,
      startTime: meeting.startTime,
      meetLink: meeting.meetLink,
    });
  }

  if (!transcript || !transcript.trim()) return { outcome: 'no_transcript' };

  // 1. Persist the full discussion FIRST, so it is never lost.
  await prisma.meetingNote.update({
    where: { meetingId: meeting.id },
    data: { rawTranscript: transcript },
  });

  // 2. Generate and attach the notes.
  try {
    const analysis = await analyze(transcript);
    if (!analysis) return { outcome: 'saved_only', error: 'No AI provider configured' };

    await prisma.meetingNote.update({
      where: { meetingId: meeting.id },
      data: {
        summary: analysis.summary,
        keyPoints: analysis.key_points,
        actionItems: analysis.action_items as unknown as object,
        notes: analysis.notes,
        transcriptStatus: 'AVAILABLE',
      },
    });

    return { outcome: 'analyzed' };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error('[transcript] analysis failed for meeting', meeting.id, error);
    // Transcript is already saved; a later run can retry just the analysis.
    return { outcome: 'saved_only', error };
  }
}
