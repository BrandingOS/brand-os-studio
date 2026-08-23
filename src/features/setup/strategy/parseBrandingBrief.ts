/**
 * Reading the whole-brand rebrand reply back — and refusing what is not one.
 *
 * The other half of `brandingPrompt.ts`. The eleven strategy fields get the
 * IDENTICAL judgement the strategy import uses — `parseStrategyValue` is the
 * same function, refusal layers included — and the two identity lines get the
 * same discipline:
 *
 *  - **Colors** must be actual hex codes. The instruction deliberately
 *    contains none, so an echoed instruction can never parse as a palette.
 *  - **Fonts** must be a `Heading + Body` pairing of plausible family names —
 *    not the instruction's own placeholder words, not a sentence, nothing
 *    carrying a colon.
 *
 * The paste is refused wholesale when it is recognisably one of OUR prompts —
 * this flow's rebrand prompt or the strategy import's — because the likeliest
 * mistake is always pasting the prompt where the reply belongs.
 *
 * Pure — no service, no store, no React.
 */
import { labelledBlocks } from '@/features/onboarding/brief/parseBrief';
import { hexToName } from '../data/colorNames';
import type { BrandColor } from '../data/mockBrand';
import {
  BRANDING_LABELS,
  BRANDING_PROMPT_SENTINELS,
  IDENTITY_ASKS,
} from './brandingPrompt';
import {
  isInstructionShaped,
  looksLikeStrategyPrompt,
  parseStrategyValue,
  strategyKeyForLabel,
  type ParsedStrategyField,
} from './parseStrategyBrief';

export interface ParsedPalette {
  /** In reply order, primary first. 2–8 entries. */
  hexes: string[];
}

export interface ParsedPairing {
  heading: string;
  body: string;
}

export type BrandingParseProblem = 'prompt' | 'unanswered';

export interface ParsedBranding {
  strategy: ParsedStrategyField[];
  palette?: ParsedPalette;
  pairing?: ParsedPairing;
  residualProse: string;
  problem?: BrandingParseProblem;
}

const SENTINEL_THRESHOLD = 2;
const fold = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** True when the text is the rebrand prompt itself. */
export function looksLikeBrandingPrompt(text: string): boolean {
  const hay = fold(text);
  let hits = 0;
  for (const sentinel of BRANDING_PROMPT_SENTINELS) {
    if (hay.includes(fold(sentinel))) hits += 1;
    if (hits >= SENTINEL_THRESHOLD) return true;
  }
  return false;
}

const HEX = /#?\b([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

function hexesIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(HEX)) {
    let h = match[1].toUpperCase();
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const hex = `#${h}`;
    if (!out.includes(hex)) out.push(hex);
  }
  return out;
}

/** The instruction's own placeholders — an echo, never anyone's typeface. */
const PLACEHOLDER_FAMILIES = new Set(['heading family', 'body family']);

/**
 * A plausible typeface family: words, digits, spaces — short, no punctuation
 * that only prose carries. "Playfair Display" yes; "with one + between" no.
 */
function isPlausibleFamily(name: string): boolean {
  const n = name.trim();
  if (!n || n.length > 40) return false;
  if (PLACEHOLDER_FAMILIES.has(n.toLowerCase())) return false;
  return /^[A-Za-z][A-Za-z0-9 ]*$/.test(n);
}

function isOwnIdentityInstruction(which: 'colors' | 'fonts', body: string): boolean {
  const value = fold(body);
  const ask = fold(IDENTITY_ASKS[which]);
  return value === ask || value.startsWith(ask) || ask.startsWith(value);
}

function parsePaletteBody(body: string): ParsedPalette | 'instruction' | null {
  if (isOwnIdentityInstruction('colors', body) || isInstructionShaped(body)) {
    return 'instruction';
  }
  const hexes = hexesIn(body);
  // One hex is not a palette; more than 8 is a swatch dump, not a decision.
  if (hexes.length < 2) return body.trim() ? 'instruction' : null;
  return { hexes: hexes.slice(0, 8) };
}

function parsePairingBody(body: string): ParsedPairing | 'instruction' | null {
  if (isOwnIdentityInstruction('fonts', body) || isInstructionShaped(body)) {
    return 'instruction';
  }
  const first = body.split(/\r?\n/)[0] ?? '';
  const parts = first.split('+').map((p) => p.trim());
  if (parts.length !== 2) return 'instruction';
  const [heading, bodyFamily] = parts;
  if (!isPlausibleFamily(heading) || !isPlausibleFamily(bodyFamily)) {
    return 'instruction';
  }
  return { heading, body: bodyFamily };
}

/**
 * Parses whatever it recognises. Order-independent; never throws.
 */
export function parseBrandingBrief(text: string): ParsedBranding {
  // Either of our prompts pasted whole is refused outright.
  if (looksLikeBrandingPrompt(text) || looksLikeStrategyPrompt(text)) {
    return { strategy: [], residualProse: '', problem: 'prompt' };
  }

  const strategy: ParsedStrategyField[] = [];
  const residual: string[] = [];
  let palette: ParsedPalette | undefined;
  let pairing: ParsedPairing | undefined;
  let sawInstruction = false;

  for (const block of labelledBlocks(text, BRANDING_LABELS)) {
    const body = block.lines.join('\n').trim();
    if (block.label === null) {
      if (body) residual.push(body);
      continue;
    }
    if (!body) continue;

    if (block.label === 'Colors') {
      const judged = parsePaletteBody(body);
      if (judged === 'instruction') sawInstruction = true;
      else if (judged) palette = judged;
      continue;
    }
    if (block.label === 'Fonts') {
      const judged = parsePairingBody(body);
      if (judged === 'instruction') sawInstruction = true;
      else if (judged) pairing = judged;
      continue;
    }

    const key = strategyKeyForLabel(block.label);
    if (!key) continue;
    const judged = parseStrategyValue(key, body);
    if (judged.kind === 'instruction') sawInstruction = true;
    else if (judged.kind === 'field') strategy.push(judged.field);
  }

  const empty = strategy.length === 0 && !palette && !pairing;
  const problem: BrandingParseProblem | undefined =
    empty && sawInstruction ? 'unanswered' : undefined;

  return {
    strategy,
    ...(palette ? { palette } : {}),
    ...(pairing ? { pairing } : {}),
    residualProse: residual.join('\n\n').trim(),
    problem,
  };
}

/**
 * A reply palette as the brand's colour groups.
 *
 * The first three hexes are Core — the colours the brand IS — and the rest
 * are Accent. Names come from `hexToName`, deduplicated the same way the
 * board's add flow does it, so an applied palette reads like one added by
 * hand.
 */
export function paletteToGroups(palette: ParsedPalette): {
  core: BrandColor[];
  accent: BrandColor[];
} {
  const taken = new Set<string>();
  const named = palette.hexes.map((hex) => {
    const base = hexToName(hex);
    let name = base;
    let n = 2;
    while (taken.has(name)) {
      name = `${base} ${n}`;
      n += 1;
    }
    taken.add(name);
    return { hex, name };
  });
  return { core: named.slice(0, 3), accent: named.slice(3) };
}
