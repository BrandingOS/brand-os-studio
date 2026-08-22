/**
 * The Brand Strategy prompt — one half of a two-way contract.
 *
 * A DIFFERENT prompt from onboarding's `buildBriefPrompt`, and deliberately
 * so. That one profiles a whole brand: what it is, plus colours, fonts and a
 * logo. This one asks for the eleven strategy answers and NOTHING else, so
 * pasting the reply into Setup cannot overwrite a palette or a typeface the
 * brand has already settled. A prompt that ranges wider than the section it
 * fills is a prompt that quietly edits the rest of the brand.
 *
 * Three properties are load-bearing, and each is a line in the prompt:
 *
 *  1. **Plain text, labelled lines.** Markdown headings, bullets and bold runs
 *     are what make LLM output unparseable. The format is boring so the parser
 *     can be deterministic.
 *  2. **Controlled options, inlined.** Embedded from the same module the
 *     normaliser reads, so the prompt and the normaliser can never disagree
 *     about what is allowed. Seven of the eleven answers are now a choice.
 *  3. **What the brand already says is stated as FACT.** Asking an AI to
 *     invent a mission for a brand that has written one produces a confident
 *     contradiction the user then has to notice and undo.
 *
 * Pure — no service, no store, no React.
 */
import { CARDINALITY, labelsOf, type VocabularyName } from '@/features/onboarding/vocabulary/vocabularies';
import { STRATEGY_CARDS, contentOf } from '../data/strategyCards';
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
export const LABEL_BY_KEY: Record<keyof BrandStrategyFields, StrategyLabel> = {
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

function pick(name: VocabularyName): string {
  const { min, max } = CARDINALITY[name];
  const how = min === max ? 'pick ONE' : `pick ${min}–${max}`;
  return `${how} from: ${labelsOf(name).join(' · ')}`;
}

/** What each label asks for, when it is not simply a vocabulary. */
const ASKS: Record<StrategyLabel, string> = {
  'Brand summary': '1–2 sentences on what the brand is and what it does.',
  Industry: pick('industry'),
  'Products / Services': 'comma-separated, 3–6 items.',
  Audience: pick('audience'),
  Positioning: pick('positioning'),
  Mission: '1 sentence on why the brand exists — not what it sells.',
  Personality: pick('personality'),
  Tone: pick('tone'),
  'Visual style': pick('style'),
  'Core values': pick('values'),
  Slogan: 'a short line that could sit under the brand name. Omit if none fits.',
};

export interface StrategyContext {
  /** Everything the brand already says about itself. Stated as fact. */
  strategy?: BrandStrategyFields;
  /** A one-line description of the business, when Setup has one. */
  description?: string;
}

/**
 * Builds the strategy prompt for a brand.
 *
 * Wrapped at a readable width because people read this before they paste it —
 * a wall of text reads as spam and gets skipped.
 */
export function buildStrategyPrompt(brandName: string, ctx: StrategyContext = {}): string {
  const name = brandName.trim() || '[BRAND NAME]';

  // Answers the brand already holds. Repeated back so the AI fills the GAPS
  // rather than proposing a second, different brand alongside the first.
  const known = ctx.strategy
    ? STRATEGY_CARDS.map((card) => ({ card, value: contentOf(card, ctx.strategy!).trim() }))
        .filter((a) => a.value.length > 0)
        .map((a) => `  ${LABEL_BY_KEY[a.card.key]}: ${a.value}`)
    : [];

  const settled = known.length
    ? `\nThis brand has ALREADY decided the following. Repeat each of these back
exactly as given — do not reword them, replace them, or offer alternatives:

${known.join('\n')}

Fill in only what is missing above, and make everything you add consistent
with what is already there.\n`
    : '';

  const about = ctx.description?.trim()
    ? `\nWhat the business does, in the owner's words:\n  ${ctx.description.trim()}\n`
    : '';

  const lines = STRATEGY_LABELS.map((label) => `${label}: ${ASKS[label]}`).join('\n');

  return `You are helping me write the BRAND STRATEGY for a brand called ${name}.
${about}${settled}
Reply in PLAIN TEXT ONLY. No markdown, no headings, no bullet characters, no bold.
Answer ONLY the brand strategy. Do not suggest colours, typefaces, or a logo.
Use exactly these labels, one per line, in this order:

${lines}

For the fields with a list of allowed options, choose only from that list.
If none of them genuinely fits, write "Other:" followed by your own word.
Do not invent facts about the business — if you do not know something, leave a
short, plainly-worded best guess and keep it brief.`;
}
