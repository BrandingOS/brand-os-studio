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

/**
 * Phrases that occur in the PROMPT and never in an answer to it.
 *
 * The paste box sits three inches from the button that copies the prompt, and
 * every line of the prompt is shaped like an answer — so pasting the prompt
 * back parses. `looksLikeBriefPrompt` counts these; two is proof. A test
 * asserts each one is really in the built prompt, because a guard that stops
 * firing after a rewording is worse than none.
 */
export const BRIEF_PROMPT_SENTINELS = [
  'You are helping me define the brand and business profile',
  'Reply in PLAIN TEXT ONLY',
  'Use exactly these labels, one per line',
  'choose only from that list',
  'Do not invent facts about the business',
] as const;

/** The keyword that marks a colours/fonts answer as a suggestion, not a fact. */
export const DIRECTIONS_KEYWORD = 'Directions:';

/**
 * What the brand demonstrably already has.
 *
 * Anything listed here is EVIDENCE the user supplied, so the prompt states it
 * as fact and forbids alternatives. Asking an AI to suggest a palette for a
 * brand that just uploaded its logo produces a confident answer that contradicts
 * the brand's own artwork — and the user then has to notice and undo it.
 */
export interface KnownAssets {
  /** Hex codes already extracted or supplied. */
  colors?: string[];
  /** Typeface families already uploaded or named. */
  fonts?: string[];
  /** True when at least one logo was brought. */
  hasLogo?: boolean;
}

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
export function buildBriefPrompt(brandName: string, known: KnownAssets = {}): string {
  const name = brandName.trim() || '[BRAND NAME]';
  const haveColors = (known.colors ?? []).filter(Boolean);
  const haveFonts = (known.fonts ?? []).filter(Boolean);

  // Stated as fact, not as a question. The brand already answered these.
  const colorsLine = haveColors.length
    ? `Colors: this brand ALREADY uses these colours — repeat them exactly, in this
  order, and do NOT suggest alternatives or extra colours:
  ${haveColors.join(', ')}`
    : `Colors: if the brand already has colours, list the hex codes.
  If it does not, write "${DIRECTIONS_KEYWORD}" and then 3 palette directions,
  each on its own line as a name followed by 3–5 hex codes.`;

  const fontsLine = haveFonts.length
    ? `Fonts: this brand ALREADY uses these typefaces — repeat them exactly and do
  NOT suggest alternatives:
  ${haveFonts.join(', ')}`
    : `Fonts: if the brand already has fonts, name the families.
  If it does not, write "${DIRECTIONS_KEYWORD}" and then 3 pairings, each on its
  own line as "Heading Family + Body Family".`;

  const evidence = known.hasLogo
    ? `\nThis brand already has a logo, so treat its existing identity as settled:
describe what it IS, and do not propose a redesign or a different direction.\n`
    : '';

  return `You are helping me define the brand and business profile for a brand called ${name}.
${evidence}

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
${colorsLine}
${fontsLine}

For the fields with a list of allowed options, choose only from that list.
If none of them genuinely fits, write "Other:" followed by your own word.
Do not invent facts about the business — if you do not know something, leave a
short, plainly-worded best guess and keep it brief.`;
}

/**
 * Deep links that open a chat with the prompt prefilled.
 *
 * Re-exported from the shared handoff menu, which owns them now that two
 * surfaces hand prompts over. Kept here so existing importers of this module
 * are unaffected.
 */
export { AI_TOOLS } from '@/shared/ai-handoff/AiPromptMenu';
