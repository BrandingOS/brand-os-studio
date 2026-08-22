/**
 * Reading the strategy reply back.
 *
 * The other half of the contract in `strategyPrompt.ts`. Because we authored
 * the labels, this is a RECOGNITION rather than a guess — no assisted call, no
 * key, no cost, and a result the user can see before it is applied.
 *
 * It reuses onboarding's labelled-text machinery (`labelledBlocks`,
 * `looksLabelled`) rather than a near-copy: the tolerance for casing, for the
 * spacing an LLM puts around a slash, and the rule that a blank line CLOSES a
 * block are all things that took a bug each to learn, and a second
 * implementation would relearn them.
 *
 * Two rules of its own:
 *
 *  - **A vocabulary answer is normalised, never coerced.** `normalize` returns
 *    the member or an honest `Other` with the wording untouched. A closed list
 *    that silently rounds an answer off is worse than free text, because the
 *    rounding is invisible.
 *  - **Nothing is applied here.** This returns what it recognised, per field,
 *    so the caller can show it and let the user choose. Parsing and writing
 *    are different decisions and the user is entitled to stand between them.
 *
 * Pure — no service, no store, no React.
 */
import {
  afterColon,
  labelledBlocks,
  looksLabelled,
  splitItems,
} from '@/features/onboarding/brief/parseBrief';
import { normalize, storedValue } from '@/features/onboarding/vocabulary/normalize';
import { CARDINALITY, VOCABULARIES } from '@/features/onboarding/vocabulary/vocabularies';
import { STRATEGY_CARDS, type StrategyKey } from '../data/strategyCards';
import type { BrandStrategyFields } from '../data/mockBrand';
import { STRATEGY_LABELS, LABEL_BY_KEY, type StrategyLabel } from './strategyPrompt';

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

export interface ParsedStrategy {
  fields: ParsedStrategyField[];
  /** Anything the parser did not recognise — offered as a free-form section. */
  residualProse: string;
}

const KEY_BY_LABEL = new Map<StrategyLabel, StrategyKey>(
  (Object.entries(LABEL_BY_KEY) as Array<[StrategyKey, StrategyLabel]>).map(
    ([key, label]) => [label, key],
  ),
);

const CARD_BY_KEY = new Map(STRATEGY_CARDS.map((c) => [c.key, c]));

/** True when the text is recognisably the reply this product's prompt asked for. */
export function looksLikeStrategyBrief(text: string): boolean {
  return looksLabelled(text, STRATEGY_LABELS);
}

/**
 * Parses whatever it recognises.
 *
 * Order-independent: an LLM occasionally reorders the labels even when told
 * not to. Never throws — an unrecognised paste yields no fields and all of the
 * text as residual prose, which the caller can still offer as a section.
 */
export function parseStrategyBrief(text: string): ParsedStrategy {
  const fields: ParsedStrategyField[] = [];
  const residual: string[] = [];

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
    const picked: string[] = [];
    let other = false;
    for (const item of raw) {
      const n = normalize(item, vocab);
      if (n.kind === 'other') other = true;
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

  return { fields, residualProse: residual.join('\n\n').trim() };
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
