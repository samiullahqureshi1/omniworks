/**
 * Gemini analysis of a meeting transcript -> structured notes.
 * Uses the Generative Language REST API with a response schema so the model
 * returns strict JSON. Requires GEMINI_API_KEY.
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

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    key_points: { type: 'ARRAY', items: { type: 'STRING' } },
    action_items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          assignee_guess: { type: 'STRING', nullable: true },
          due_date_guess: { type: 'STRING', nullable: true },
        },
        required: ['text'],
      },
    },
    notes: { type: 'STRING' },
  },
  required: ['summary', 'key_points', 'action_items', 'notes'],
};

const PROMPT = `You are an assistant that analyzes meeting transcripts. Read the transcript and produce:
- summary: a concise 2-4 sentence overview of the meeting.
- key_points: the most important points discussed, as short strings.
- action_items: concrete follow-ups. For each, "text" is the task; "assignee_guess" is the person responsible if clearly implied (else null); "due_date_guess" is an ISO date (YYYY-MM-DD) or short phrase if a deadline is implied (else null).
- notes: fuller free-text meeting notes capturing decisions, context, and open questions.
Only use information present in the transcript. Do not invent action items. Transcript follows:

`;

/**
 * Analyze a transcript. Returns structured notes, or throws on API error so
 * callers can decide how to handle failure.
 */
export async function analyzeTranscript(transcript: string): Promise<MeetingAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured.');

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT + transcript }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned an empty response.');

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Gemini returned malformed JSON.');
  }

  return {
    summary: String(parsed.summary || ''),
    key_points: Array.isArray(parsed.key_points) ? parsed.key_points.map(String) : [],
    action_items: Array.isArray(parsed.action_items)
      ? parsed.action_items.map((a: any) => ({
          text: String(a?.text || ''),
          assignee_guess: a?.assignee_guess ? String(a.assignee_guess) : null,
          due_date_guess: a?.due_date_guess ? String(a.due_date_guess) : null,
        })).filter((a: ActionItem) => a.text)
      : [],
    notes: String(parsed.notes || ''),
  };
}
