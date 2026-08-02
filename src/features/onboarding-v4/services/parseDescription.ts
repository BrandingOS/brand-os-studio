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
const MODEL = 'claude-opus-5';

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
  /** Canonical section, or 'custom' when the description used a heading we
   *  don't map (e.g. "Brand Promise") — those keep their own title. */
  key: SectionKey | 'custom';
  title: string;
  content: string;
}

function getApiKey(): string | undefined {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
  // A truncated copy-paste ("sk-ant-…") contains non-ASCII characters and
  // makes fetch throw before the request is even sent — treat it as missing
  // so we go straight to the heuristic parser instead of erroring.
  if (!key || !/^[\x20-\x7E]+$/.test(key)) return undefined;
  return key;
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
 * Splits the description on ANY markdown-style heading (`# X`, `## X`,
 * `**X**`, `X:` on its own short line, numbered headings), maps known
 * heading names to canonical sections (Mission/Vision/…), and keeps
 * unrecognized headings as custom sections with their own title — so a
 * full AI-generated brand doc never gets crammed into one section.
 */
const HEADING_KEY_PATTERNS: Array<[SectionKey, RegExp]> = [
  ['mission', /^(?:brand\s+|our\s+)?(?:mission|purpose)\b/i],
  ['vision', /^(?:brand\s+|our\s+)?vision\b/i],
  ['audience', /^(?:target\s+)?audiences?\b|^who\s+we\s+serve\b|^(?:target\s+)?customers?\b/i],
  ['voice', /^(?:brand\s+)?(?:voice|tone(?:\s+of\s+voice)?|personality)\b/i],
  ['values', /^(?:core\s+|brand\s+)?values\b|^principles\b|^beliefs\b/i],
  ['positioning', /^(?:brand\s+|market\s+)?positioning\b|^differentiation\b/i],
  ['story', /^(?:brand\s+|origin\s+)?story\b|^origins?\b|^history\b|^background\b/i],
];

function headingKeyFor(title: string): SectionKey | null {
  const t = title.trim();
  for (const [key, re] of HEADING_KEY_PATTERNS) {
    if (re.test(t)) return key;
  }
  return null;
}

/** Parse one line as a heading. Returns the title (plus any content that sat
 *  on the same line after a colon), or null when the line is body text. */
function parseHeadingLine(line: string): { title: string; inline: string } | null {
  const t = line.trim();
  if (!t) return null;

  // # Heading / ## Heading / ### Heading — AI docs often number them
  // ("# 2. Mission"), so strip the numbering from the title.
  let m = /^#{1,6}\s+(.+?)\s*:?\s*$/.exec(t);
  if (m) return { title: m[1].replace(/^\d+[.)]\s*/, ''), inline: '' };

  // **Heading** or **Heading:** (optionally with inline content after)
  m = /^\*\*(.+?)\*\*\s*:?\s*(.*)$/.exec(t);
  if (m && m[1].length <= 48) return { title: m[1], inline: m[2] };

  // "Mission: content on the same line" / "1. Target Audience:" — only when
  // the part before the colon is short and title-like (Title Case or a known
  // section name), so normal sentences containing a colon aren't mistaken
  // for headings ("Our promise is simple: we show up").
  m = /^(?:\d+[.)]\s+)?([A-Za-z][A-Za-z&/'’ -]{1,40}):\s*(.*)$/.exec(t);
  if (m) {
    const title = m[1].trim();
    const words = title.split(/\s+/);
    const connectors = new Set(['of', 'and', 'the', 'for', 'to', 'a', 'an', 'in']);
    const titleCased = words.every(
      (word) => /^[A-Z]/.test(word) || connectors.has(word.toLowerCase()),
    );
    if (words.length <= 4 && (titleCased || headingKeyFor(title))) {
      return { title, inline: m[2] };
    }
  }

  // Bare short line that matches a known section name ("Mission", "Vision")
  m = /^(?:\d+[.)]\s+)?([A-Za-z][A-Za-z&/'’ -]{1,40})$/.exec(t);
  if (m && headingKeyFor(m[1])) return { title: m[1], inline: '' };

  return null;
}

export function heuristicParse(description: string): ParsedSection[] {
  const text = description.trim();
  if (!text) return [];

  type RawSection = { title: string | null; lines: string[] };
  const sections: RawSection[] = [{ title: null, lines: [] }];

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    // Horizontal rules are pure separators — never content.
    if (/^(?:-{3,}|_{3,}|\*{3,})$/.test(trimmed)) continue;

    const heading = parseHeadingLine(line);
    if (heading) {
      sections.push({ title: heading.title, lines: heading.inline ? [heading.inline] : [] });
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }

  const out: ParsedSection[] = [];
  const canonicalSeen = new Map<SectionKey, ParsedSection>();

  const push = (key: SectionKey | 'custom', title: string, content: string) => {
    if (!content) return;
    if (key !== 'custom') {
      const existing = canonicalSeen.get(key);
      if (existing) {
        existing.content = `${existing.content}\n\n${content}`;
        return;
      }
      const section: ParsedSection = { key, title: SECTION_TITLES[key], content };
      canonicalSeen.set(key, section);
      out.push(section);
      return;
    }
    out.push({ key, title, content });
  };

  const hasHeadings = sections.some((s) => s.title !== null);

  if (hasHeadings) {
    for (const s of sections) {
      const content = s.lines.join('\n').trim();
      if (s.title === null) {
        // Preamble before the first heading — keep it if substantial.
        if (content.length > 40) push('custom', 'Overview', content);
        continue;
      }
      const key = headingKeyFor(s.title);
      push(key ?? 'custom', s.title.trim(), content);
    }
    return out;
  }

  // No headings at all — sentence-level keyword sniff (unchanged behavior).
  const inlinePatterns: Array<[SectionKey, RegExp]> = [
    ['audience', /\b(?:audience|customers?|users?|targets?|for\s+(?:young|busy|small|large|aspiring|creative|professional))\b/i],
    ['voice', /\b(?:voice|tone|personality|sounds?\s+like|feels?\s+like)\b/i],
    ['mission', /\b(?:mission|purpose|exists?\s+to|we\s+(?:help|build|make|create))\b/i],
    ['vision', /\b(?:vision|future|long[-\s]?term|will\s+become)\b/i],
    ['values', /\b(?:values|believe|principles?|stand\s+for)\b/i],
    ['positioning', /\b(?:positioning|premium|budget|luxury|affordable|high[-\s]?end)\b/i],
    ['story', /\b(?:story|founded|started|began|origin)\b/i],
  ];
  const sniffed = new Map<SectionKey, string>();
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const sentence of sentences) {
    for (const [key, re] of inlinePatterns) {
      if (sniffed.has(key)) continue;
      if (re.test(sentence)) {
        sniffed.set(key, sentence);
        break;
      }
    }
  }
  return Array.from(sniffed.entries()).map(([key, content]) => ({
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
