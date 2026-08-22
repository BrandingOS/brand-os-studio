/**
 * Reading the strategy reply back — and refusing everything that is not one.
 *
 * The other half of the contract in `strategyPrompt.ts`. Because we authored
 * the labels this is a RECOGNITION rather than a guess: no assisted call, no
 * key, no cost, and a result the user can see before it is applied.
 *
 * It reuses onboarding's labelled-text machinery (`labelledBlocks`,
 * `looksLabelled`) rather than a near-copy: the tolerance for casing, for the
 * spacing an LLM puts around a slash, and the rule that a blank line CLOSES a
 * block are all things that took a bug each to learn.
 *
 * ## What it refuses, and why it has to
 *
 * The single most likely mistake here is pasting the PROMPT where the reply
 * belongs — the button that produces it is three inches away. And the prompt
 * is a trap, because it is full of lines shaped exactly like answers:
 *
 *     Industry: pick ONE from: Real Estate · Hospitality · Food & Beverage · …
 *
 * That parsed. `Real Estate` is a real member, so detection passed; then the
 * first comma-separated item, `pick ONE from: Real Estate`, matched no member
 * and the `Other` escape hatch — which exists so a closed list never silently
 * rounds off someone's own word — stored the instruction verbatim as the
 * brand's industry. The escape hatch is right; letting INSTRUCTIONS through it
 * was not.
 *
 * So there are three layers, each catching what the one before it cannot:
 *
 *  1. **The whole text is the prompt.** Two of `PROMPT_SENTINELS` is proof.
 *     Refused outright with a message that says what to do instead.
 *  2. **A value IS the instruction for its own field.** Compared against
 *     `ASKS`, which the prompt is built from, so this cannot fall behind the
 *     wording. Catches a hand-edited or partly-filled prompt.
 *  3. **A value is instruction-SHAPED, or is the option list.** An `Other`
 *     that opens like an instruction, carries a colon, or runs long is not
 *     someone's own word; a vocabulary answer naming far more members than the
 *     field accepts is the menu, not a choice.
 *
 * The bias is deliberate: a refused paste costs one retry, an accepted one
 * costs the user their brand strategy.
 *
 * Pure — no service, no store, no React.
 */
import {
  labelledBlocks,
  looksLabelled,
  splitItems,
} from '@/features/onboarding/brief/parseBrief';
import { normalize, storedValue } from '@/features/onboarding/vocabulary/normalize';
import { CARDINALITY, VOCABULARIES } from '@/features/onboarding/vocabulary/vocabularies';
import { STRATEGY_CARDS, type StrategyKey } from '../data/strategyCards';
import type { BrandStrategyFields } from '../data/mockBrand';
import {
  ASKS,
  INSTRUCTION_OPENERS,
  LABEL_BY_KEY,
  PROMPT_SENTINELS,
  STRATEGY_LABELS,
  type StrategyLabel,
} from './strategyPrompt';

/** One field the paste actually answered. */
export interface ParsedStrategyField {
  key: StrategyKey;
  /** What the field will hold — a vocabulary id, ids, or the user's prose. */
  value: string | string[];
  /** What that reads as, for the confirmation the user sees. */
  display: string;
  /** True when a vocabulary answer landed outside its list and kept its wording. */
  isOther: boolean;
}

/** Why a paste produced nothing, when the reason is worth saying out loud. */
export type StrategyParseProblem =
  /** They pasted the prompt instead of the reply. */
  | 'prompt'
  /** Labelled lines, but every value was still an instruction. */
  | 'unanswered';

export interface ParsedStrategy {
  fields: ParsedStrategyField[];
  /** Anything the parser did not recognise — offered as a free-form section. */
  residualProse: string;
  problem?: StrategyParseProblem;
}

const KEY_BY_LABEL = new Map<StrategyLabel, StrategyKey>(
  (Object.entries(LABEL_BY_KEY) as Array<[StrategyKey, StrategyLabel]>).map(
    ([key, label]) => [label, key],
  ),
);

const CARD_BY_KEY = new Map(STRATEGY_CARDS.map((c) => [c.key, c]));

/** How many sentinels prove it. One could appear in a quoted reply; two cannot. */
const SENTINEL_THRESHOLD = 2;

/** Longest an `Other` word may be. Beyond this it is a sentence, not a label. */
const MAX_OTHER_LENGTH = 48;

const fold = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

/** True when the text is this product's own prompt rather than a reply to it. */
export function looksLikeStrategyPrompt(text: string): boolean {
  const hay = fold(text);
  let hits = 0;
  for (const sentinel of PROMPT_SENTINELS) {
    if (hay.includes(fold(sentinel))) hits += 1;
    if (hits >= SENTINEL_THRESHOLD) return true;
  }
  return false;
}

/** True when the text is recognisably a reply this product's prompt asked for. */
export function looksLikeStrategyBrief(text: string): boolean {
  if (looksLikeStrategyPrompt(text)) return false;
  return looksLabelled(text, STRATEGY_LABELS);
}

/** True when a value is the instruction for its own field, echoed back. */
function isOwnInstruction(key: StrategyKey, body: string): boolean {
  const value = fold(body);
  const ask = fold(ASKS[key]);
  return value === ask || value.startsWith(ask) || ask.startsWith(value);
}

/** True when a value is shaped like an instruction rather than an answer. */
function isInstructionShaped(body: string): boolean {
  return INSTRUCTION_OPENERS.some((re) => re.test(body.trim()));
}

/**
 * True when a word cannot be somebody's own answer.
 *
 * A colon is the giveaway — `Other` exists for a WORD ("Property Development"),
 * and no one's own word for their industry contains a colon or runs to a
 * sentence. Prose fields are exempt; this guards the vocabularies only.
 */
function isImplausibleOther(word: string): boolean {
  const w = word.trim();
  return w.length > MAX_OTHER_LENGTH || w.includes(':') || isInstructionShaped(w);
}

/**
 * Parses whatever it recognises.
 *
 * Order-independent: an LLM occasionally reorders the labels even when told
 * not to. Never throws — an unrecognised paste yields no fields and all of the
 * text as residual prose, which the caller can still offer as a section.
 */
export function parseStrategyBrief(text: string): ParsedStrategy {
  if (looksLikeStrategyPrompt(text)) {
    return { fields: [], residualProse: '', problem: 'prompt' };
  }

  const fields: ParsedStrategyField[] = [];
  const residual: string[] = [];
  let sawInstruction = false;

  for (const block of labelledBlocks(text, STRATEGY_LABELS)) {
    const body = block.lines.join('\n').trim();
    if (block.label === null) {
      if (body) residual.push(body);
      continue;
    }
    if (!body) continue;

    const key = KEY_BY_LABEL.get(block.label);
    const card = key ? CARD_BY_KEY.get(key) : undefined;
    if (!key || !card) continue;

    // An AI that omits an answer often says so rather than staying silent.
    if (/^(n\/a|none|unknown|not applicable|-+)$/i.test(body)) continue;

    // Layer 2 + 3: the value is the ask, not the answer.
    if (isOwnInstruction(key, body) || isInstructionShaped(body)) {
      sawInstruction = true;
      continue;
    }

    if (!card.vocab) {
      const prose =
        key === 'slogan' ? body.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '') : body;
      fields.push({ key, value: prose, display: prose, isOther: false });
      continue;
    }

    const vocab = VOCABULARIES[card.vocab];
    const max = card.max ?? CARDINALITY[card.vocab].max;
    // "Other: Property Development" is the escape hatch the prompt offers.
    const raw = splitItems(body.replace(/^\s*other\s*:\s*/i, ''));

    // Layer 3: the option list, not a choice. A reply naming far more members
    // than the field accepts is the menu the prompt printed.
    const memberHits = raw.filter(
      (item) => normalize(item, vocab).kind === 'member',
    ).length;
    if (memberHits > max + 2) {
      sawInstruction = true;
      continue;
    }

    const picked: string[] = [];
    let other = false;
    for (const item of raw) {
      const n = normalize(item, vocab);
      if (n.kind === 'other') {
        // The escape hatch keeps a WORD, never an instruction.
        if (isImplausibleOther(n.text)) {
          sawInstruction = true;
          continue;
        }
        other = true;
      }
      const stored = storedValue(n);
      if (stored && !picked.includes(stored)) picked.push(stored);
      if (picked.length >= max) break;
    }
    if (picked.length === 0) continue;

    const display = picked
      .map((id) => vocab.find((m) => m.id === id)?.label ?? id)
      .join(' · ');

    fields.push({
      key,
      value: max === 1 ? picked[0] : picked,
      display,
      isOther: other,
    });
  }

  const problem: StrategyParseProblem | undefined =
    fields.length === 0 && sawInstruction ? 'unanswered' : undefined;

  return { fields, residualProse: residual.join('\n\n').trim(), problem };
}

/** Applies chosen fields onto a strategy, leaving everything else alone. */
export function applyStrategyFields(
  strategy: BrandStrategyFields,
  fields: ParsedStrategyField[],
): BrandStrategyFields {
  const next: BrandStrategyFields = { ...strategy };
  for (const f of fields) {
    // Written through a cast because the field's shape is decided by its own
    // card (list or scalar) and the parser already honoured it.
    (next as Record<string, unknown>)[f.key] = f.value;
  }
  return next;
}

/** The label a field is presented under. */
export function labelOf(key: StrategyKey): string {
  return CARD_BY_KEY.get(key)?.name ?? key;
}

export { STRATEGY_LABELS };
