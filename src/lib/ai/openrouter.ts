/**
 * Meeting-transcript analysis via OpenRouter.
 *
 * Mirrors the shape of src/lib/google/gemini.ts so the two are interchangeable:
 * the transcript pipeline prefers OpenRouter and falls back to Gemini.
 */

export interface ActionItem {
  text: string;
  assignee_guess: string | null;
  due_date_guess: string | null;
}

export interface MeetingAnalysis {
  summary: string;
  key_points: string[];
  action_items: ActionItem[];
  notes: string;
}

/** Canonical OpenRouter slug (the `google/` prefix is required). */
export const DEFAULT_OPENROUTER_MODEL = 'google/gemma-4-26b-a4b-it:free';

export function openRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function openRouterModel(): string {
  return process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
}

const SYSTEM_PROMPT = `You are a meeting-notes assistant. You are given the raw transcript of a meeting.
Return ONLY a single JSON object — no markdown, no code fences, no commentary — with exactly these keys:

{
  "summary": "a concise 2-4 sentence summary of what the meeting was about and what was decided",
  "key_points": ["the most important discussion points, one short sentence each"],
  "action_items": [
    { "text": "the task to be done",
      "assignee_guess": "person's name if clearly stated in the transcript, otherwise null",
      "due_date_guess": "YYYY-MM-DD if a date is clearly stated, otherwise null" }
  ],
  "notes": "well-structured meeting notes in plain text, covering the discussion in order"
}

Base everything strictly on the transcript. Never invent participants, decisions, or dates.
If the transcript is too short or has no real content, still return the JSON with empty arrays and a brief summary saying so.`;

/** Pulls a JSON object out of a model response that may include prose or fences. */
function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fall back to the outermost {...} block.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('OpenRouter returned no parsable JSON.');
    }
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === 'string' ? v : String(v ?? ''))).filter(Boolean);
}

function asActionItems(value: unknown): ActionItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { text: item, assignee_guess: null, due_date_guess: null };
      }
      const o = (item ?? {}) as Record<string, unknown>;
      const text = typeof o.text === 'string' ? o.text : '';
      if (!text) return null;
      return {
        text,
        assignee_guess: typeof o.assignee_guess === 'string' ? o.assignee_guess : null,
        due_date_guess: typeof o.due_date_guess === 'string' ? o.due_date_guess : null,
      };
    })
    .filter((x): x is ActionItem => x !== null);
}

/**
 * Analyse a raw transcript into structured meeting notes.
 * Throws on transport/auth errors so the caller can retry on the next run.
 */
export async function analyzeTranscriptWithOpenRouter(transcript: string): Promise<MeetingAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set.');

  // Keep well inside the context window of the free tier.
  const MAX_CHARS = 100_000;
  const body = transcript.length > MAX_CHARS ? transcript.slice(0, MAX_CHARS) : transcript;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Optional attribution headers recognised by OpenRouter.
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'BridgeWorkspace Meeting Notes',
    },
    body: JSON.stringify({
      model: openRouterModel(),
      temperature: 0.2,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Meeting transcript:\n\n${body}` },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned an empty response.');

  const parsed = extractJson(content) as Record<string, unknown>;

  return {
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    key_points: asStringArray(parsed.key_points),
    action_items: asActionItems(parsed.action_items),
    notes: typeof parsed.notes === 'string' ? parsed.notes : '',
  };
}
