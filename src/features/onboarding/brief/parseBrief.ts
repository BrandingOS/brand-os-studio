/**
 * Recognising and parsing the brief this product asked for.
 *
 * The other half of the two-way contract in `prompt.ts`. Because we authored
 * the labels, detection is a recognition rather than a guess — and when it
 * hits, the whole understanding pass runs with **no assisted call** (FR-052).
 *
 * Two decisions worth knowing about:
 *
 *  - **Detection needs three labels at line starts.** One or two would fire on
 *    ordinary prose ("Tone: friendly, I guess" in a paragraph), and the cost of
 *    a false positive is real — prose would be shredded into fields instead of
 *    being read properly. Three labels is a shape no one writes by accident.
 *
 *  - **Colours and fonts are two-mode.** `Colors: #1B4D3E, #E8DCC8` is what the
 *    brand HAS; `Colors: Directions:` followed by named palettes is what an AI
 *    SUGGESTS. These carry different source ranks, so conflating them would let
 *    a suggestion be written as the brand's actual palette. The parser keeps
 *    them in separate fields and never merges them.
 *
 * Never throws. A partially-recognised brief parses what it recognises and
 * hands the rest back as prose, so the caller can still run the assisted pass
 * over the remainder.
 *
 * Pure — no service, no store, no React.
 */
import { BRIEF_LABELS, DIRECTIONS_KEYWORD, type BriefLabel } from './prompt';

export interface PaletteDirection {
  name: string;
  hexes: string[];
}

export interface FontDirection {
  heading: string;
  body: string;
}

export interface ParsedBrief {
  summary?: string;
  industry?: string;
  products?: string[];
  audience?: string;
  positioning?: string;
  slogan?: string;
  personality?: string[];
  tone?: string;
  style?: string[];
  values?: string[];
  /** Hex codes the brand ALREADY has. Source rank `brief`. */
  colors?: string[];
  /** Palettes an AI SUGGESTED. Source rank `ai`. Never brand truth. */
  colorDirections?: PaletteDirection[];
  /** Families the brand ALREADY has. Source rank `brief`. */
  fonts?: string[];
  /** Pairings an AI SUGGESTED. Source rank `ai`. Never brand truth. */
  fontDirections?: FontDirection[];
  /** Anything the parser did not recognise, for the assisted pass. */
  residualProse: string;
}

/** How many labels must appear at a line start before we call it a brief. */
const DETECTION_THRESHOLD = 3;

const HEX = /#?\b([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

function labelPattern(label: string): RegExp {
  // Tolerant of casing and of the spacing an LLM puts around a slash.
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s*\/\s*/g, '\\s*/\\s*');
  return new RegExp(`^\\s*${escaped}\\s*:`, 'i');
}

/** Which label from `labels`, if any, this line opens. */
function labelIn<L extends string>(line: string, labels: readonly L[]): L | null {
  for (const label of labels) {
    if (labelPattern(label).test(line)) return label;
  }
  return null;
}

/** Which brief label, if any, this line opens. */
function labelAt(line: string): BriefLabel | null {
  return labelIn(line, BRIEF_LABELS);
}

/**
 * True when the text is recognisably the brief our prompt asked for.
 *
 * Conservative by design: below the threshold the caller treats the text as
 * prose, which is the safe direction — a missed brief costs one assisted call,
 * a false positive costs the user their meaning.
 */
export function looksLikeBrief(text: string): boolean {
  return looksLabelled(text, BRIEF_LABELS);
}

/**
 * The same recognition, over any label list.
 *
 * Shared so a second prompt/parser pair (Setup's Brand Strategy import) gets
 * the identical threshold and the identical tolerance for casing and spacing,
 * rather than a near-copy that drifts.
 */
export function looksLabelled<L extends string>(text: string, labels: readonly L[]): boolean {
  if (!text.trim()) return false;
  const seen = new Set<L>();
  for (const line of text.split(/\r?\n/)) {
    const label = labelIn(line, labels);
    if (label) seen.add(label);
    if (seen.size >= DETECTION_THRESHOLD) return true;
  }
  return false;
}

export function afterColon(line: string): string {
  const i = line.indexOf(':');
  return i === -1 ? '' : line.slice(i + 1).trim();
}

export function splitItems(raw: string): string[] {
  return raw
    .split(/[,;·•|]+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter(Boolean);
}

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

/** Groups a block's lines into `{ label, body }` runs, over any label list. */
export function labelledBlocks<L extends string>(
  text: string,
  labels: readonly L[],
): Array<{ label: L | null; lines: string[] }> {
  const out: Array<{ label: L | null; lines: string[] }> = [];
  let current: { label: L | null; lines: string[] } = { label: null, lines: [] };
  for (const line of text.split(/\r?\n/)) {
    const label = labelIn(line, labels);
    if (label) {
      if (current.label !== null || current.lines.length) out.push(current);
      current = { label, lines: [afterColon(line)] };
    } else if (current.label !== null && !line.trim() && current.lines.some((l) => l.trim())) {
      // A blank line CLOSES a labelled block. Everything after it is prose the
      // user wrote around the brief, not a continuation of the last field —
      // without this, a paragraph appended to a brief is silently swallowed
      // into whichever label happened to come last.
      out.push(current);
      current = { label: null, lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  out.push(current);
  return out;
}

const blocks = (text: string) => labelledBlocks(text, BRIEF_LABELS);

/**
 * Parses whatever it recognises.
 *
 * Order-independent: the labels may arrive in any sequence, because an LLM
 * occasionally reorders them even when told not to.
 */
export function parseBrief(text: string): ParsedBrief {
  const result: ParsedBrief = { residualProse: '' };
  const residual: string[] = [];

  for (const block of blocks(text)) {
    const body = block.lines.join('\n').trim();
    if (block.label === null) {
      if (body) residual.push(body);
      continue;
    }
    if (!body) continue;
    const firstLine = block.lines[0]?.trim() ?? '';

    switch (block.label) {
      case 'Brand summary':
        result.summary = body;
        break;
      case 'Industry':
        result.industry = firstLine;
        break;
      case 'Products / Services':
        result.products = splitItems(body);
        break;
      case 'Audience':
        result.audience = body;
        break;
      case 'Positioning':
        result.positioning = body;
        break;
      case 'Slogan':
        result.slogan = body.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '');
        break;
      case 'Personality':
        result.personality = splitItems(body);
        break;
      case 'Tone':
        // At most one — a brand with two tones has none.
        result.tone = splitItems(body)[0];
        break;
      case 'Visual style':
        result.style = splitItems(body);
        break;
      case 'Core values':
        result.values = splitItems(body);
        break;
      case 'Colors': {
        const directive = new RegExp(DIRECTIONS_KEYWORD.replace(':', '\\s*:'), 'i');
        if (directive.test(body)) {
          // SUGGESTIONS. Kept apart from `colors` so they can never be written
          // as the brand's actual palette.
          const after = body.slice(body.search(directive)).replace(directive, '');
          result.colorDirections = after
            .split(/\r?\n/)
            .map((line) => {
              const hexes = hexesIn(line);
              if (hexes.length < 2) return null;
              const name = line.split(/[:\-–—]/)[0].replace(HEX, '').replace(/#/g, '').trim();
              return { name: name || 'Palette', hexes };
            })
            .filter((d): d is PaletteDirection => d !== null);
        } else {
          const hexes = hexesIn(body);
          if (hexes.length) result.colors = hexes;
        }
        break;
      }
      case 'Fonts': {
        const directive = new RegExp(DIRECTIONS_KEYWORD.replace(':', '\\s*:'), 'i');
        if (directive.test(body)) {
          const after = body.slice(body.search(directive)).replace(directive, '');
          result.fontDirections = after
            .split(/\r?\n/)
            .map((line) => {
              const parts = line.split('+').map((s) => s.trim().replace(/^[-–•\d.\s]+/, ''));
              if (parts.length < 2 || !parts[0] || !parts[1]) return null;
              return { heading: parts[0], body: parts[1] };
            })
            .filter((d): d is FontDirection => d !== null);
        } else {
          const families = splitItems(body.replace(/\+/g, ','));
          if (families.length) result.fonts = families;
        }
        break;
      }
    }
  }

  result.residualProse = residual.join('\n\n').trim();
  return result;
}
