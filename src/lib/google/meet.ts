import { getAccessTokenFromRefresh } from './calendar';

/**
 * Best-effort fetch of a Google Meet transcript's text for a meeting.
 *
 * IMPORTANT: Meet auto-transcription only exists on Google Workspace Business
 * Standard+ (never personal Gmail), and requires the meetings.space.readonly
 * scope. This function NEVER throws — it returns the transcript text if it can
 * confidently find one, otherwise null, so the caller degrades to "no
 * transcript available" + manual notes.
 */

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

    // List transcripts for that conference record.
    const transcripts = await meetGet(`${best.name}/transcripts`, accessToken);
    const first = transcripts?.transcripts?.[0];
    if (!first?.name || first.state !== 'ENDED') return null;

    // Page through transcript entries and concatenate "Speaker: text".
    const lines: string[] = [];
    let pageToken: string | undefined;
    let guard = 0;
    do {
      const q = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : '';
      const entries = await meetGet(`${first.name}/entries${q}`, accessToken);
      if (!entries) break;
      for (const e of entries.transcriptEntries || []) {
        const speaker = e.participant?.split('/').pop() || 'Speaker';
        if (e.text) lines.push(`${speaker}: ${e.text}`);
      }
      pageToken = entries.nextPageToken;
      guard++;
    } while (pageToken && guard < 50);

    const text = lines.join('\n').trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export { meetingCodeFromLink };
