import { getAccessTokenFromRefresh } from './calendar';

const MEET_API = 'https://meet.googleapis.com/v2';

async function meetGet(path: string, accessToken: string): Promise<any | null> {
  try {
    const res = await fetch(`${MEET_API}/${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Extract the Meet meeting code (e.g. "abc-defg-hij") from a Meet URL. */
function meetingCodeFromLink(meetLink?: string | null): string | null {
  if (!meetLink) return null;
  const m = meetLink.match(/meet\.google\.com\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

export interface MeetParticipant {
  displayName: string;
  email: string | null;
  joinTime: string | null;
  leaveTime: string | null;
}

/**
 * Given a known conferenceRecordName (e.g. "conferenceRecords/IKrdO1ge..."),
 * fetch all participants and transcript using the Google Meet REST API.
 * Returns both lists, never throws.
 */
export async function fetchMeetParticipantsAndTranscript(params: {
  conferenceRecordName: string;
  accessToken: string;
}): Promise<{ participants: MeetParticipant[]; transcript: string | null }> {
  const { conferenceRecordName, accessToken } = params;

  // --- 1. Participants ---
  const participants: MeetParticipant[] = [];
  try {
    let pageToken: string | undefined;
    let guard = 0;
    do {
      const q = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '';
      const page = await meetGet(`${conferenceRecordName}/participants${q}`, accessToken);
      for (const p of page?.participants || []) {
        const session = p.signedinUser || p.anonymousUser || {};
        participants.push({
          displayName: session.displayName || p.displayName || 'Unknown',
          email: session.user
            ? session.user.replace(/^users\//, '')
            : (session.email ?? null),
          joinTime: p.earliestStartTime || null,
          leaveTime: p.latestEndTime || null,
        });
      }
      pageToken = page?.nextPageToken;
      guard++;
    } while (pageToken && guard < 20);
  } catch (e: any) {
    console.warn('[Meet API] Participant fetch error:', e.message);
  }

  // --- 2. Transcript ---
  let transcript: string | null = null;
  try {
    const transcriptsPage = await meetGet(`${conferenceRecordName}/transcripts`, accessToken);
    const firstTranscript = transcriptsPage?.transcripts?.find(
      (t: any) => t.state === 'ENDED'
    );

    if (firstTranscript?.name) {
      const lines: string[] = [];
      let pageToken: string | undefined;
      let guard = 0;
      do {
        const q = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '';
        const entries = await meetGet(`${firstTranscript.name}/entries${q}`, accessToken);
        for (const e of entries?.transcriptEntries || []) {
          const speaker = e.participant?.split('/').pop() || 'Speaker';
          if (e.text) lines.push(`${speaker}: ${e.text}`);
        }
        pageToken = entries?.nextPageToken;
        guard++;
      } while (pageToken && guard < 50);

      if (lines.length > 0) {
        transcript = lines.join('\n').trim();
      }
    }
  } catch (e: any) {
    console.warn('[Meet API] Transcript fetch error:', e.message);
  }

  return { participants, transcript };
}

export async function fetchMeetTranscriptText(params: {
  refreshToken: string;
  startTime: Date;
  meetLink?: string | null;
}): Promise<string | null> {
  try {
    const accessToken = await getAccessTokenFromRefresh(params.refreshToken);

    // List recent conference records and pick the one whose start time is
    // closest to this meeting (a host rarely has two meetings at once).
    const list = await meetGet('conferenceRecords', accessToken);
    const records: any[] = list?.conferenceRecords || [];
    if (records.length === 0) return null;

    const targetMs = params.startTime.getTime();
    let best: any = null;
    let bestDelta = Infinity;
    for (const rec of records) {
      const t = rec.startTime ? new Date(rec.startTime).getTime() : NaN;
      if (isNaN(t)) continue;
      const delta = Math.abs(t - targetMs);
      // Only consider records within ~3h of the scheduled start.
      if (delta < bestDelta && delta < 3 * 60 * 60 * 1000) {
        best = rec;
        bestDelta = delta;
      }
    }
    if (!best?.name) return null;

    const { transcript } = await fetchMeetParticipantsAndTranscript({
      conferenceRecordName: best.name,
      accessToken,
    });
    return transcript;
  } catch {
    return null;
  }
}

export { meetingCodeFromLink };
