/**
 * The eleven things a brand strategy says, as cards.
 *
 * One list, shared by the board (which renders them) and the editor (which
 * changes them), so the two can never disagree about what a field is or where
 * it saves. It is deliberately the SAME eleven the onboarding review collects,
 * in the same order and under the same names: a user who answered them once
 * should recognise every one of them here, and find their answer in it.
 *
 * The shape of a field follows the concept, not convenience — choices where a
 * closed vocabulary genuinely exists, prose everywhere the meaning lives in the
 * wording. That is the same rule the review applies, and it is why Tone is a
 * single pick and Positioning is a sentence.
 */
import { CARDINALITY, VOCABULARIES, type VocabularyName } from '@/features/onboarding/vocabulary/vocabularies';
import type { BrandStrategyFields } from './mockBrand';

export type StrategyKey = keyof BrandStrategyFields;

export interface StrategyCard {
  key: StrategyKey;
  /** What the card is called. Matches the review's wording exactly. */
  name: string;
  /** Present when the answer comes from a closed list. */
  vocab?: VocabularyName;
  /** How many may be chosen. Derived from the vocabulary's own cardinality. */
  max?: number;
  /**
   * Whether a word of the user's own can be stored here.
   *
   * Everywhere a vocabulary exists EXCEPT visual style, which is a closed union
   * in the schema — a free word there fails validation and costs the whole save.
   */
  allowsOther?: boolean;
}

export const STRATEGY_CARDS: StrategyCard[] = [
  { key: 'summary', name: 'Brand summary' },
  { key: 'industry', name: 'Industry', vocab: 'industry', max: 1, allowsOther: true },
  { key: 'products', name: 'Products / Services' },
  { key: 'audience', name: 'Audience' },
  { key: 'positioning', name: 'Positioning' },
  { key: 'mission', name: 'Mission' },
  {
    key: 'personality',
    name: 'Personality',
    vocab: 'personality',
    max: CARDINALITY.personality.max,
    allowsOther: true,
  },
  { key: 'tone', name: 'Tone', vocab: 'tone', max: 1, allowsOther: true },
  { key: 'style', name: 'Visual style', vocab: 'style', max: CARDINALITY.style.max },
  {
    key: 'values',
    name: 'Core values',
    vocab: 'values',
    max: CARDINALITY.values.max,
    allowsOther: true,
  },
  { key: 'slogan', name: 'Slogan' },
];

/** A stored id read back as a person's word. Unknown ids ARE the user's word. */
export function labelFor(vocab: VocabularyName, id: string): string {
  return VOCABULARIES[vocab].find((m) => m.id === id)?.label ?? id;
}

/** What a card currently says, as one readable line. Empty means unanswered. */
export function contentOf(card: StrategyCard, strategy: BrandStrategyFields): string {
  const value = strategy[card.key];
  if (Array.isArray(value)) {
    return card.vocab ? value.map((v) => labelFor(card.vocab!, v)).join(' · ') : value.join(' · ');
  }
  const text = String(value ?? '');
  if (!text) return '';
  return card.vocab ? labelFor(card.vocab, text) : text;
}

/** The ids a card currently holds, whether it stores one or several. */
export function selectionOf(card: StrategyCard, strategy: BrandStrategyFields): string[] {
  const value = strategy[card.key];
  if (Array.isArray(value)) return value;
  return value ? [String(value)] : [];
}
