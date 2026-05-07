/**
 * Onboarding-v4 — distribute the user's free-form brand description into
 * structured About sections (Mission, Vision, Audience, Voice, Values,
 * Positioning, Story).
 *
 * Calls Claude when `VITE_ANTHROPIC_API_KEY` is present (same env key the
 * brand-consistency provider uses) and falls back to a deterministic
 * heuristic parser when it isn't, so the feature degrades to a sensible
 * keyword-split instead of breaking the flow.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5';

const SECTION_KEYS = [
  'mission',
  'vision',
  'audience',
  'voice',
  'values',
  'positioning',
  'story',
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

const SECTION_TITLES: Record<SectionKey, string> = {
  mission: 'Mission',
  vision: 'Vision',
  audience: 'Audience',
  voice: 'Voice',
  values: 'Values',
  positioning: 'Positioning',
  story: 'Story',
};

export interface ParsedSection {
  key: SectionKey;
  title: string;
  content: string;
}

function getApiKey(): string | undefined {
  return import.meta.env.VITE_ANTHROPIC_API_KEY;
}

const SYSTEM_PROMPT = `You are a senior brand strategist. The user pastes a free-form description of their brand. Distribute the content into structured sections so each one stands on its own.

Return ONLY a JSON object with these optional string fields:
- mission (what the brand does and why)
- vision (where it's going)
- audience (who it serves)
- voice (tone, attitude, personality)
- values (principles and beliefs)
- positioning (how it sits in the market)
- story (origin, narrative)

Rules:
- Use ONLY information present in the user's text. Do not invent.
- Each value should be 1-3 concise sentences.
- Omit fields the user didn't cover.
- Keep the user's own phrasing where natural.
- Output a single JSON object, no prose, no code fences.`;

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('No JSON object found');
  return JSON.parse(raw.slice(first, last + 1));
}

function normalizeParsed(json: unknown): ParsedSection[] {
  if (!json || typeof json !== 'object') return [];
  const j = json as Record<string, unknown>;
  const out: ParsedSection[] = [];
  for (const key of SECTION_KEYS) {
    const v = j[key];
    if (typeof v === 'string' && v.trim()) {
      out.push({ key, title: SECTION_TITLES[key], content: v.trim() });
    }
  }
  return out;
}

/**
 * Heuristic fallback used when the API key is missing or the call fails.
 * Looks for explicit headings ("Mission:", "## Audience", etc.) before
 * falling back to a split-by-blank-lines so we still produce something
 * structured rather than dumping the whole blob into one section.
 */
function heuristicParse(description: string): ParsedSection[] {
  const text = description.trim();
  if (!text) return [];

  const out = new Map<SectionKey, string>();

  const headingPatterns: Array<[SectionKey, RegExp]> = [
    ['mission', /^(?:#{1,3}\s*|\d+\.\s*)?(?:brand\s+)?mission\s*[:-]?\s*$/im],
    ['vision', /^(?:#{1,3}\s*|\d+\.\s*)?(?:brand\s+)?vision\s*[:-]?\s*$/im],
    ['audience', /^(?:#{1,3}\s*|\d+\.\s*)?(?:target\s+)?audience\s*[:-]?\s*$/im],
    ['voice', /^(?:#{1,3}\s*|\d+\.\s*)?(?:brand\s+)?(?:voice|tone|personality)\s*[:-]?\s*$/im],
    ['values', /^(?:#{1,3}\s*|\d+\.\s*)?(?:brand\s+)?values\s*[:-]?\s*$/im],
    ['positioning', /^(?:#{1,3}\s*|\d+\.\s*)?positioning\s*[:-]?\s*$/im],
    ['story', /^(?:#{1,3}\s*|\d+\.\s*)?(?:brand\s+)?story\s*[:-]?\s*$/im],
  ];

  // First pass: split on the strongest heading we find.
  type Slice = { key: SectionKey; start: number };
  const slices: Slice[] = [];
  for (const [key, re] of headingPatterns) {
    const m = re.exec(text);
    if (m && m.index !== undefined) slices.push({ key, start: m.index });
  }
  slices.sort((a, b) => a.start - b.start);

  if (slices.length > 0) {
    for (let i = 0; i < slices.length; i++) {
      const cur = slices[i];
      const next = slices[i + 1];
      const headingMatch = headingPatterns.find(([k]) => k === cur.key)?.[1].exec(text);
      const headingEnd = headingMatch
        ? headingMatch.index! + headingMatch[0].length
        : cur.start;
      const sliceEnd = next ? next.start : text.length;
      const body = text.slice(headingEnd, sliceEnd).trim();
      if (body) out.set(cur.key, body);
    }
  }

  // Inline keyword sniff for anything we didn't cover via headings.
  const inlinePatterns: Array<[SectionKey, RegExp]> = [
    ['audience', /\b(?:audience|customers?|users?|targets?|for\s+(?:young|busy|small|large|aspiring|creative|professional))\b/i],
    ['voice', /\b(?:voice|tone|personality|sounds?\s+like|feels?\s+like)\b/i],
    ['mission', /\b(?:mission|purpose|exists?\s+to|we\s+(?:help|build|make|create))\b/i],
    ['vision', /\b(?:vision|future|long[-\s]?term|will\s+become)\b/i],
    ['values', /\b(?:values|believe|principles?|stand\s+for)\b/i],
    ['positioning', /\b(?:positioning|premium|budget|luxury|affordable|high[-\s]?end)\b/i],
    ['story', /\b(?:story|founded|started|began|origin)\b/i],
  ];
  if (out.size === 0) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const sentence of sentences) {
      for (const [key, re] of inlinePatterns) {
        if (out.has(key)) continue;
        if (re.test(sentence)) {
          out.set(key, sentence);
          break;
        }
      }
    }
  }

  return Array.from(out.entries()).map(([key, content]) => ({
    key,
    title: SECTION_TITLES[key],
    content,
  }));
}

/**
 * Parse a free-form brand description into structured About sections.
 *
 * @returns array of sections to add. Empty array means "nothing usable".
 */
export async function parseDescriptionToSections(
  description: string,
  signal?: AbortSignal,
): Promise<ParsedSection[]> {
  const text = description.trim();
  if (!text) return [];

  const apiKey = getApiKey();
  if (!apiKey) return heuristicParse(text);

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 800,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    });
    if (!res.ok) {
      console.warn('[onboarding-v4] description parse non-OK:', res.status);
      return heuristicParse(text);
    }
    const data = await res.json();
    const reply: string | undefined = data?.content?.[0]?.text;
    if (!reply) return heuristicParse(text);
    const sections = normalizeParsed(extractJson(reply));
    return sections.length > 0 ? sections : heuristicParse(text);
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') return [];
    console.warn('[onboarding-v4] description parse failed:', err);
    return heuristicParse(text);
  }
}
