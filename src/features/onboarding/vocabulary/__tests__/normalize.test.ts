/**
 * Normalisation: free text in, a vocabulary member or an honest `Other` out.
 *
 * The load-bearing claim is the NEGATIVE one — a miss is never coerced. A
 * closed list that silently rounds an answer to the nearest-looking member is
 * worse than free text, because the rounding is invisible to everyone
 * downstream.
 */
import { describe, it, expect } from 'vitest';
import { normalize, normalizeMany, splitList, storedValue, displayValue } from '../normalize';
import { INDUSTRY, PERSONALITY, STYLE, TONE, VALUES, VOCABULARIES } from '../vocabularies';

describe('every member round-trips', () => {
  it('resolves its own label and its own id', () => {
    for (const vocab of Object.values(VOCABULARIES)) {
      for (const m of vocab) {
        expect(normalize(m.label, vocab)).toEqual({ kind: 'member', member: m });
        expect(normalize(m.id, vocab)).toEqual({ kind: 'member', member: m });
      }
    }
  });

  it('ignores case, spacing and punctuation', () => {
    expect(storedValue(normalize('  REAL ESTATE ', INDUSTRY))).toBe('real-estate');
    expect(storedValue(normalize('food & beverage', INDUSTRY))).toBe('food-beverage');
    expect(storedValue(normalize('Non Profit', INDUSTRY))).toBe('non-profit');
  });
});

describe('near-misses map only where they genuinely mean the same thing', () => {
  it('resolves the words people and LLMs actually use', () => {
    expect(storedValue(normalize('contemporary', STYLE))).toBe('modern');
    expect(storedValue(normalize('premium', STYLE))).toBe('luxury');
    expect(storedValue(normalize('handmade', STYLE))).toBe('artisanal');
    expect(storedValue(normalize('sustainable', VALUES))).toBe('sustainability');
    expect(storedValue(normalize('casual', TONE))).toBe('conversational');
    expect(storedValue(normalize('property', INDUSTRY))).toBe('real-estate');
  });

  it('does NOT map two distinct members onto each other', () => {
    // These are four edits apart and mean different things. A fuzzy distance
    // metric would confidently produce a wrong answer here.
    expect(storedValue(normalize('editorial', STYLE))).toBe('editorial');
    expect(storedValue(normalize('elegant', STYLE))).toBe('elegant');
  });
});

describe('a miss stays the user’s words', () => {
  it('returns Other with the wording untouched', () => {
    const n = normalize('Sovereign Wealth Advisory', INDUSTRY);
    expect(n).toEqual({ kind: 'other', text: 'Sovereign Wealth Advisory' });
    expect(displayValue(n)).toBe('Sovereign Wealth Advisory');
  });

  it('honours an explicit "Other:" from the prompt', () => {
    expect(normalize('Other: Taxidermy', INDUSTRY)).toEqual({ kind: 'other', text: 'Taxidermy' });
  });

  it('never truncates, cases or coerces a miss', () => {
    const weird = 'B2B Ultra-Niche Widgetry (EMEA)';
    expect(normalize(weird, INDUSTRY)).toEqual({ kind: 'other', text: weird });
  });

  it('is total — empty input returns rather than throwing', () => {
    expect(normalize('', INDUSTRY)).toEqual({ kind: 'other', text: '' });
    expect(normalize('   ', INDUSTRY)).toEqual({ kind: 'other', text: '' });
  });
});

describe('lists', () => {
  it('splits on every separator the retired flow accepted', () => {
    expect(splitList('Quality, Integrity; Heritage · Care')).toEqual([
      'Quality', 'Integrity', 'Heritage', 'Care',
    ]);
  });

  it('de-duplicates and honours the cap', () => {
    const out = normalizeMany(['Bold', 'bold', 'Playful', 'Elegant'], PERSONALITY, 2);
    expect(out.map(storedValue)).toEqual(['bold', 'playful']);
  });

  it('keeps the user’s order — what they said first is what they meant most', () => {
    const out = normalizeMany(['Heritage', 'Quality'], VALUES);
    expect(out.map(storedValue)).toEqual(['heritage', 'quality']);
  });

  it('drops empty entries rather than emitting a blank Other', () => {
    expect(normalizeMany(['Quality', '', '  '], VALUES).map(storedValue)).toEqual(['quality']);
  });
});
