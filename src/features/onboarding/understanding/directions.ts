/**
 * Starting directions for someone who has nothing to bring.
 *
 * These are HYPOTHESES about this brand, not templates. There is no gallery, no
 * category list and no "browse more": three at a time, named by what they
 * actually are, each shown set in the brand's own name. If none fit, the user
 * asks for another and one card is replaced.
 *
 * Deterministic for a given brand and description, so re-entering the flow does
 * not reshuffle what the user was looking at. The variation comes from the
 * offset, which only moves when they ask for something else.
 */
import type { StartingDirection } from './interpret';

/**
 * The pool.
 *
 * Each names a real position — "Quiet technical" — with three qualities under
 * it. Deliberately NOT "Modern", "Classic", "Minimal", which describe nothing
 * and could belong to any brand.
 */
const POOL: ReadonlyArray<Omit<StartingDirection, 'id'>> = [
  {
    title: 'Quiet technical',
    qualities: 'Precision · restraint · neutral typography',
    colors: ['#1C3F5E', '#8BA6B8', '#F0EDE4', '#2A2A28'],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 500,
    tone: 'Precise and unhurried',
  },
  {
    title: 'Bold editorial',
    qualities: 'High contrast · confidence · expressive typography',
    colors: ['#111113', '#E03A24', '#F5F4EF', '#7A7873'],
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontWeight: 700,
    tone: 'Direct and declarative',
  },
  {
    title: 'Warm modern',
    qualities: 'Human · approachable · softer visual system',
    colors: ['#B5462F', '#E8A33A', '#FAF6EC', '#3A2C22'],
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 600,
    tone: 'Warm and plain-spoken',
  },
  {
    title: 'Calm utility',
    qualities: 'Legible · unhurried · quietly practical',
    colors: ['#2F5D50', '#A8C0B4', '#F4F3EE', '#22302B'],
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: 400,
    tone: 'Clear and undramatic',
  },
  {
    title: 'Sharp contemporary',
    qualities: 'Tight · graphic · deliberately spare',
    colors: ['#141414', '#C9F24D', '#FFFFFF', '#5A5A57'],
    fontFamily: 'system-ui, sans-serif',
    fontWeight: 800,
    tone: 'Confident and economical',
  },
];

/** How many are offered at once. Four is a shopping trip; three is a choice. */
export const DIRECTION_COUNT = 3;

/**
 * Three directions for this brand.
 *
 * `offset` rotates the window when the user asks for another, so "show me
 * another direction" replaces one card rather than re-rolling all three.
 */
export function generateDirections(
  brandName: string,
  description = '',
  offset = 0,
): StartingDirection[] {
  // The description biases the starting point rather than selecting outright —
  // we are proposing, not deciding, and a keyword is thin evidence.
  const text = `${brandName} ${description}`.toLowerCase();
  const bias =
    /bank|capital|legal|infra|security|compliance|enterprise/.test(text) ? 0
    : /studio|editorial|magazine|press|gallery|film/.test(text) ? 1
    : /care|community|family|health|learn|school|food/.test(text) ? 2
    : /tool|utility|dashboard|ops|logistics/.test(text) ? 3
    : 4;

  return Array.from({ length: DIRECTION_COUNT }, (_, i) => {
    const def = POOL[(bias + offset + i) % POOL.length];
    return { ...def, id: `${def.title.toLowerCase().replace(/\s+/g, '-')}-${offset + i}` };
  });
}
