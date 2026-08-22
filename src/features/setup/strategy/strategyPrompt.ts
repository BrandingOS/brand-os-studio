/**
 * The Brand Strategy prompt — one half of a two-way contract.
 *
 * A DIFFERENT prompt from onboarding's `buildBriefPrompt`, and deliberately
 * so. That one profiles a whole brand: what it is, plus colours, fonts and a
 * logo. This one asks for strategy answers and NOTHING else, so pasting the
 * reply into Setup cannot overwrite a palette or a typeface the brand has
 * already settled. A prompt that ranges wider than the section it fills is a
 * prompt that quietly edits the rest of the brand.
 *
 * Four properties are load-bearing:
 *
 *  1. **Plain text, labelled lines.** Markdown headings, bullets and bold runs
 *     are what make LLM output unparseable. The format is boring so the parser
 *     can be deterministic.
 *  2. **Controlled options, inlined.** Embedded from the same module the
 *     normaliser reads, so the prompt and the normaliser can never disagree
 *     about what is allowed.
 *  3. **The caller chooses which fields to ask about.** A brand that has
 *     already written its mission should be able to leave it alone; asking for
 *     everything every time makes the reply an overwrite by default.
 *  4. **`ASKS` and `PROMPT_SENTINELS` are exported so the PARSER can recognise
 *     this prompt and refuse it.** Pasting the prompt where the reply belongs
 *     is the single most likely mistake a user can make here, and the text is
 *     full of `Industry: pick ONE from: Real Estate · …` lines that read
 *     exactly like answers. The parser cannot be careful about that unless it
 *     can see what the prompt actually said.
 *
 * Pure — no service, no store, no React.
 */
import { CARDINALITY, labelsOf, type VocabularyName } from '@/features/onboarding/vocabulary/vocabularies';
import { STRATEGY_CARDS, contentOf, type StrategyKey } from '../data/strategyCards';
import type { BrandStrategyFields } from '../data/mockBrand';

/** The labels this prompt emits and `parseStrategyBrief` recognises. */
export const STRATEGY_LABELS = [
  'Brand summary',
  'Industry',
  'Products / Services',
  'Audience',
  'Positioning',
  'Mission',
  'Personality',
  'Tone',
  'Visual style',
  'Core values',
  'Slogan',
] as const;

export type StrategyLabel = (typeof STRATEGY_LABELS)[number];

/** Card key ↔ label. One map, so the prompt, the parser and the board agree. */
export const LABEL_BY_KEY: Record<StrategyKey, StrategyLabel> = {
  summary: 'Brand summary',
  industry: 'Industry',
  products: 'Products / Services',
  audience: 'Audience',
  positioning: 'Positioning',
  mission: 'Mission',
  personality: 'Personality',
  tone: 'Tone',
  style: 'Visual style',
  values: 'Core values',
  slogan: 'Slogan',
};

export const ALL_STRATEGY_KEYS = STRATEGY_CARDS.map((c) => c.key);

function pick(name: VocabularyName): string {
  const { min, max } = CARDINALITY[name];
  const how = min === max ? 'pick ONE' : `pick ${min}–${max}`;
  return `${how} from: ${labelsOf(name).join(' · ')}`;
}

/**
 * What each field asks for.
 *
 * Exported because the parser compares a pasted value against these: a body
 * that IS the instruction is the prompt echoed back, never an answer. Keeping
 * one definition means that check can never fall behind the prompt's wording.
 */
export const ASKS: Record<StrategyKey, string> = {
  summary: '1–2 sentences on what the brand is and what it does.',
  industry: pick('industry'),
  products: 'comma-separated, 3–6 items.',
  audience: pick('audience'),
  positioning: pick('positioning'),
  mission: '1 sentence on why the brand exists — not what it sells.',
  personality: pick('personality'),
  tone: pick('tone'),
  style: pick('style'),
  values: pick('values'),
  slogan: 'a short line that could sit under the brand name. Omit if none fits.',
};

/**
 * Phrases that appear in THIS prompt and could not plausibly appear in an
 * answer to it. Two of them together is proof the user pasted the prompt.
 *
 * A test asserts every one of these is really in the built prompt, so the list
 * cannot rot into a check that never fires.
 */
export const PROMPT_SENTINELS = [
  'You are helping me write the BRAND STRATEGY',
  'Reply in PLAIN TEXT ONLY',
  'Use exactly these labels',
  'Do not suggest colours, typefaces, or a logo',
  'For the fields with a list of allowed options',
  'Do not invent facts about the business',
] as const;

/** The instruction shapes the prompt uses. A value starting like this is an ask. */
export const INSTRUCTION_OPENERS = [
  /^pick\s+one\s+from\s*:/i,
  /^pick\s+\d+\s*[–—-]\s*\d+\s+from\s*:/i,
  /^comma-separated\b/i,
  /^\d+\s*[–—-]\s*\d+\s+sentences?\b/i,
  /^\d+\s+sentences?\s+on\b/i,
  /^a\s+short\s+line\s+that\s+could\s+sit\b/i,
  /^only\s+if\b/i,
];

export interface StrategyContext {
  /** Everything the brand already says about itself. */
  strategy?: BrandStrategyFields;
  /** A one-line description of the business, when Setup has one. */
  description?: string;
  /**
   * Which fields to ask about. Defaults to all eleven.
   *
   * Anything left out that the brand HAS is still handed over as settled
   * context, so the answers stay consistent with it — the difference is that
   * the AI is told to leave it alone rather than to produce a replacement.
   */
  ask?: readonly StrategyKey[];
}

/**
 * Builds the strategy prompt for a brand.
 *
 * Wrapped at a readable width because people read this before they paste it —
 * a wall of text reads as spam and gets skipped.
 */
export function buildStrategyPrompt(brandName: string, ctx: StrategyContext = {}): string {
  const name = brandName.trim() || '[BRAND NAME]';
  const asked = new Set<StrategyKey>(ctx.ask ?? ALL_STRATEGY_KEYS);

  // Answers the brand holds that we are NOT asking about. Repeated back so the
  // AI fills the gaps rather than proposing a second, different brand.
  const settled = ctx.strategy
    ? STRATEGY_CARDS.filter((card) => !asked.has(card.key))
        .map((card) => ({ card, value: contentOf(card, ctx.strategy!).trim() }))
        .filter((a) => a.value.length > 0)
        .map((a) => `  ${LABEL_BY_KEY[a.card.key]}: ${a.value}`)
    : [];

  const settledBlock = settled.length
    ? `\nThis brand has ALREADY decided the following. Do not restate them, do not
offer alternatives, and make everything you write consistent with them:

${settled.join('\n')}\n`
    : '';

  const about = ctx.description?.trim()
    ? `\nWhat the business does, in the owner's words:\n  ${ctx.description.trim()}\n`
    : '';

  const lines = STRATEGY_CARDS.filter((c) => asked.has(c.key))
    .map((c) => `${LABEL_BY_KEY[c.key]}: ${ASKS[c.key]}`)
    .join('\n');

  return `You are helping me write the BRAND STRATEGY for a brand called ${name}.
${about}${settledBlock}
Reply in PLAIN TEXT ONLY. No markdown, no headings, no bullet characters, no bold.
Answer ONLY the brand strategy. Do not suggest colours, typefaces, or a logo.
Use exactly these labels, one per line, in this order — and REPLACE the
instruction after each label with your actual answer:

${lines}

For the fields with a list of allowed options, choose only from that list.
If none of them genuinely fits, write "Other:" followed by your own word.
Do not invent facts about the business — if you do not know something, leave a
short, plainly-worded best guess and keep it brief.`;
}

/**
 * A prompt for ONE free-form section, for the by-hand flow.
 *
 * The + button means the user wants to write something; this hands them the
 * same help without dragging the whole eleven-field machine into a modal whose
 * job is one heading and one paragraph. There is nothing to parse — the reply
 * IS the content, so they paste it straight into the box.
 */
export function buildSectionPrompt(
  brandName: string,
  sectionTitle: string,
  strategy?: BrandStrategyFields,
): string {
  const name = brandName.trim() || '[BRAND NAME]';
  const title = sectionTitle.trim() || 'this part of the brand';

  const known = strategy
    ? STRATEGY_CARDS.map((card) => ({ card, value: contentOf(card, strategy).trim() }))
        .filter((a) => a.value.length > 0)
        .map((a) => `  ${LABEL_BY_KEY[a.card.key]}: ${a.value}`)
    : [];

  const context = known.length
    ? `\nWhat this brand already says about itself — stay consistent with it:\n\n${known.join('\n')}\n`
    : '';

  return `Write the "${title}" section of the brand strategy for a brand called ${name}.
${context}
Reply in PLAIN TEXT ONLY — no markdown, no headings, no bullet characters, no
bold, and no label. Give me just the paragraph itself, two to four sentences,
so I can paste it straight in.
Do not invent facts about the business. If you do not know something, keep it
short and plainly worded.`;
}
