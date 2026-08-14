/**
 * The Build-with-AI prompt.
 *
 * This is one half of a **two-way contract**. Because the product authors the
 * prompt, it can recognise the answer: `parseBrief` looks for exactly the
 * labels emitted here, which turns "did the user paste an AI brief?" from a
 * guess into a recognition, and lets that path parse with no assisted call of
 * our own (FR-052).
 *
 * Three properties are load-bearing, and each one is a line in the prompt:
 *
 *  1. **Plain text, labelled lines.** Markdown headings, bullets and bold
 *     runs are what make LLM output unparseable. The format is boring so the
 *     parser can be deterministic.
 *  2. **Controlled options, inlined.** The vocabularies are embedded from the
 *     same module the normaliser reads, so the prompt and the normaliser can
 *     never disagree about what is allowed.
 *  3. **Two modes for colours and fonts.** A brand either HAS them or does
 *     not. Existing values are evidence the user supplied; suggested
 *     directions are a guess. They carry different weight, so the prompt makes
 *     the second mode explicit with a `Directions:` keyword rather than
 *     leaving the parser to infer which it got (FR-048, FR-056).
 *
 * Pure — no service, no store, no React.
 */
import { CARDINALITY, labelsOf, type VocabularyName } from '../vocabulary/vocabularies';

/** The labels `parseBrief` recognises. The prompt emits exactly these. */
export const BRIEF_LABELS = [
  'Brand summary',
  'Industry',
  'Products / Services',
  'Audience',
  'Positioning',
  'Slogan',
  'Personality',
  'Tone',
  'Visual style',
  'Core values',
  'Colors',
  'Fonts',
] as const;

export type BriefLabel = (typeof BRIEF_LABELS)[number];

/** The keyword that marks a colours/fonts answer as a suggestion, not a fact. */
export const DIRECTIONS_KEYWORD = 'Directions:';

function pick(name: VocabularyName): string {
  const { min, max } = CARDINALITY[name];
  const how = min === max ? `pick ONE` : `pick ${min}–${max}`;
  return `${how} from: ${labelsOf(name).join(' · ')}`;
}

/**
 * Builds the prompt for a brand.
 *
 * Wrapped at a readable width because people read this before they paste it —
 * a wall of text reads as spam and gets skipped.
 */
export function buildBriefPrompt(brandName: string): string {
  const name = brandName.trim() || '[BRAND NAME]';
  return `You are helping me define the brand and business profile for a brand called ${name}.

Reply in PLAIN TEXT ONLY. No markdown, no headings, no bullet characters, no bold.
Keep it concise — a lightweight profile, not a strategy document.
Use exactly these labels, one per line, in this order:

Brand summary: 1–2 sentences on what the brand is and what it does.
Industry: ${pick('industry')}
Products / Services: comma-separated, 3–6 items.
Audience: 1 sentence on who it is for.
Positioning: 1 sentence on where it sits in its market.
Slogan: only if one is genuinely warranted, otherwise omit this line entirely.
Personality: ${pick('personality')}
Tone: ${pick('tone')}
Visual style: ${pick('style')}
Core values: ${pick('values')}
Colors: if the brand already has colours, list the hex codes.
  If it does not, write "${DIRECTIONS_KEYWORD}" and then 3 palette directions,
  each on its own line as a name followed by 3–5 hex codes.
Fonts: if the brand already has fonts, name the families.
  If it does not, write "${DIRECTIONS_KEYWORD}" and then 3 pairings, each on its
  own line as "Heading Family + Body Family".

For the fields with a list of allowed options, choose only from that list.
If none of them genuinely fits, write "Other:" followed by your own word.
Do not invent facts about the business — if you do not know something, leave a
short, plainly-worded best guess and keep it brief.`;
}

/** Deep links that open a chat with the prompt prefilled, ready to send. */
export const AI_TOOLS = [
  {
    id: 'chatgpt' as const,
    label: 'Open in ChatGPT',
    hint: 'Prompt prefilled — just hit send',
    buildUrl: (prompt: string) => `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`,
  },
  {
    id: 'claude' as const,
    label: 'Open in Claude',
    hint: 'Prompt prefilled — just hit send',
    buildUrl: (prompt: string) => `https://claude.ai/new?q=${encodeURIComponent(prompt)}`,
  },
];
