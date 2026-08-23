/**
 * The whole-brand rebrand prompt — one half of a two-way contract.
 *
 * The strategy prompt's bigger sibling: same labelled-line format, same
 * closed vocabularies, plus the two identity lines the strategy prompt
 * deliberately forbids — `Colors:` and `Fonts:`. It exists for the moment a
 * brand is CHANGING ("make it premium", "we're pivoting younger"), so unlike
 * the strategy prompt it does not repeat existing answers back as immovable
 * fact for the asked sections; it hands them over as the starting point and
 * asks for what they should become.
 *
 * What it will never ask for: a logo. The logo is the one identity asset an
 * AI reply cannot carry and this flow must never touch.
 *
 * The same contract rules as `strategyPrompt.ts`, learned there the hard way:
 *
 *  - `BRANDING_ASKS` and `BRANDING_PROMPT_SENTINELS` are exported so the
 *    parser can recognise this prompt pasted back where the reply belongs and
 *    refuse it. Tests assert every sentinel and every ask is genuinely in the
 *    built prompt.
 *  - The Colors instruction contains NO example hexes and the Fonts
 *    instruction's placeholder families are known to the parser — an echoed
 *    instruction must have nothing in it that could parse as an answer.
 *
 * Pure — no service, no store, no React.
 */
import { STRATEGY_CARDS, contentOf, type StrategyKey } from '../data/strategyCards';
import type { BrandColor, BrandFont, BrandStrategyFields } from '../data/mockBrand';
import { ASKS, LABEL_BY_KEY } from './strategyPrompt';
import type { BrandingSectionId } from './checkpoints';

/** The two labels this prompt adds to the strategy set. */
export const IDENTITY_LABELS = ['Colors', 'Fonts'] as const;

export const BRANDING_LABELS = [
  ...STRATEGY_CARDS.map((c) => LABEL_BY_KEY[c.key]),
  ...IDENTITY_LABELS,
] as const;

export type BrandingLabel = (typeof BRANDING_LABELS)[number];

/**
 * What the identity lines ask for.
 *
 * No example hexes, no example families that could pass for real ones — the
 * placeholder words are chosen so that if an AI (or a paste of the raw
 * prompt) echoes them, the parser recognises the instruction, not an answer.
 */
export const IDENTITY_ASKS: Record<'colors' | 'fonts', string> = {
  colors:
    'the brand palette as 3–5 hex codes on one line, the primary colour first.',
  fonts:
    'a Google Fonts pairing written as Heading Family + Body Family, with one + between the two.',
};

/** Every ask this prompt can emit, for the parser's echoed-instruction check. */
export const BRANDING_ASKS: Record<string, string> = {
  ...ASKS,
  colors: IDENTITY_ASKS.colors,
  fonts: IDENTITY_ASKS.fonts,
};

/**
 * Phrases that appear in THIS prompt and could not plausibly appear in an
 * answer to it. Two together is proof the user pasted the prompt.
 */
export const BRANDING_PROMPT_SENTINELS = [
  'You are helping me EVOLVE the branding',
  'Reply in PLAIN TEXT ONLY',
  'Use exactly these labels',
  'Never suggest a logo',
  'For the fields with a list of allowed options',
  'Do not invent facts about the business',
] as const;

export interface BrandingContext {
  strategy?: BrandStrategyFields;
  colors?: { core: BrandColor[]; accent: BrandColor[] };
  fonts?: BrandFont[];
  /** The user's direction — what is changing and why. Optional. */
  direction?: string;
  /**
   * Which sections to ask about. Defaults to all except icons (icons are
   * never asked from the AI — they are recomputed client-side from the new
   * strategy, so they have no line in the prompt at all).
   */
  ask?: readonly BrandingSectionId[];
}

const STRATEGY_LINES = (asked: boolean) =>
  asked
    ? STRATEGY_CARDS.map((c) => `${LABEL_BY_KEY[c.key]}: ${ASKS[c.key]}`).join('\n')
    : '';

function currentPalette(colors?: BrandingContext['colors']): string {
  if (!colors) return '';
  const all = [...colors.core, ...colors.accent].map((c) => c.hex).filter(Boolean);
  return all.join(' ');
}

function currentPairing(fonts?: BrandFont[]): string {
  if (!fonts || fonts.length === 0) return '';
  const heading = fonts[0]?.family ?? '';
  const body = fonts[1]?.family ?? heading;
  return heading ? `${heading} + ${body}` : '';
}

/** What the brand already says, as context lines for the unasked sections. */
function settledLines(ctx: BrandingContext, asked: Set<BrandingSectionId>): string[] {
  const lines: string[] = [];
  if (!asked.has('strategy') && ctx.strategy) {
    for (const card of STRATEGY_CARDS) {
      const value = contentOf(card, ctx.strategy).trim();
      if (value) lines.push(`  ${LABEL_BY_KEY[card.key]}: ${value}`);
    }
  }
  if (!asked.has('colors')) {
    const palette = currentPalette(ctx.colors);
    if (palette) lines.push(`  Colors: ${palette}`);
  }
  if (!asked.has('fonts')) {
    const pairing = currentPairing(ctx.fonts);
    if (pairing) lines.push(`  Fonts: ${pairing}`);
  }
  return lines;
}

/** The brand's current identity, shown as the starting point of the change. */
function startingPoint(ctx: BrandingContext, asked: Set<BrandingSectionId>): string[] {
  const lines: string[] = [];
  if (asked.has('strategy') && ctx.strategy) {
    for (const card of STRATEGY_CARDS) {
      const value = contentOf(card, ctx.strategy).trim();
      if (value) lines.push(`  ${LABEL_BY_KEY[card.key]}: ${value}`);
    }
  }
  if (asked.has('colors')) {
    const palette = currentPalette(ctx.colors);
    if (palette) lines.push(`  Colors: ${palette}`);
  }
  if (asked.has('fonts')) {
    const pairing = currentPairing(ctx.fonts);
    if (pairing) lines.push(`  Fonts: ${pairing}`);
  }
  return lines;
}

export function buildBrandingPrompt(brandName: string, ctx: BrandingContext = {}): string {
  const name = brandName.trim() || '[BRAND NAME]';
  const asked = new Set<BrandingSectionId>(
    (ctx.ask ?? ['colors', 'fonts', 'strategy']).filter((s) => s !== 'icons'),
  );

  const direction = ctx.direction?.trim()
    ? `\nThe change I want:\n  ${ctx.direction.trim()}\n`
    : '';

  const current = startingPoint(ctx, asked);
  const currentBlock = current.length
    ? `\nWhere the brand is TODAY — your starting point, not your answer. Evolve it
in the direction asked; keep what already serves it:

${current.join('\n')}\n`
    : '';

  const settled = settledLines(ctx, asked);
  const settledBlock = settled.length
    ? `\nThese parts are SETTLED and not part of this change. Do not restate them,
do not offer alternatives, and keep everything you write consistent with them:

${settled.join('\n')}\n`
    : '';

  const identityLines = [
    asked.has('colors') ? `Colors: ${IDENTITY_ASKS.colors}` : '',
    asked.has('fonts') ? `Fonts: ${IDENTITY_ASKS.fonts}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const lines = [STRATEGY_LINES(asked.has('strategy')), identityLines]
    .filter(Boolean)
    .join('\n');

  return `You are helping me EVOLVE the branding of a brand called ${name}.
${direction}${currentBlock}${settledBlock}
Reply in PLAIN TEXT ONLY. No markdown, no headings, no bullet characters, no bold.
Never suggest a logo, a logo change, or logo directions — the logo is settled.
Use exactly these labels, one per line, in this order — and REPLACE the
instruction after each label with your actual answer:

${lines}

For the fields with a list of allowed options, choose only from that list.
If none of them genuinely fits, write "Other:" followed by your own word.
Do not invent facts about the business — if you do not know something, leave a
short, plainly-worded best guess and keep it brief.`;
}
