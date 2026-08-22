import { describe, expect, it } from 'vitest';
import {
  parseStrategyBrief,
  looksLikeStrategyBrief,
  applyStrategyFields,
  labelOf,
} from '../parseStrategyBrief';
import { EMPTY_STRATEGY } from '../../data/mockBrand';

const find = (text: string, key: string) =>
  parseStrategyBrief(text).fields.find((f) => f.key === key);

describe('looksLikeStrategyBrief', () => {
  it('needs three labelled lines, so ordinary prose is not shredded', () => {
    expect(looksLikeStrategyBrief('Our tone: friendly, I suppose.')).toBe(false);
    expect(
      looksLikeStrategyBrief('Mission: X\nTone: Direct\nAudience: Startups'),
    ).toBe(true);
  });

  it('is false for empty text', () => {
    expect(looksLikeStrategyBrief('   ')).toBe(false);
  });
});

describe('parseStrategyBrief', () => {
  it('stores a vocabulary answer as its ID, and shows its label', () => {
    const f = find('Tone: Direct\nMission: m\nAudience: Startups', 'tone');
    expect(f?.value).toBe('direct');
    expect(f?.display).toBe('Direct');
    expect(f?.isOther).toBe(false);
  });

  it('keeps prose as the user wrote it', () => {
    const f = find('Mission: To make shipping boring.\nTone: Direct\nAudience: Startups', 'mission');
    expect(f?.value).toBe('To make shipping boring.');
  });

  // The rule the vocabularies exist to protect: a miss is never coerced.
  it('keeps an unmatched word verbatim and flags it', () => {
    const f = find('Industry: Other: Property Development\nTone: Direct\nMission: m', 'industry');
    expect(f?.value).toBe('Property Development');
    expect(f?.isOther).toBe(true);
  });

  it('honours a card cap — tone takes one answer, not two', () => {
    const f = find('Tone: Direct, Witty\nMission: m\nAudience: Startups', 'tone');
    expect(f?.value).toBe('direct');
  });

  it('takes a list for a multi-answer card', () => {
    const f = find(
      'Core values: Transparency, Quality, Care, Ambition, Heritage, Integrity\nTone: Direct\nMission: m',
      'values',
    );
    // CARDINALITY caps core values at five.
    expect(Array.isArray(f?.value)).toBe(true);
    expect((f?.value as string[]).length).toBe(5);
  });

  it('strips the quotes an AI wraps a slogan in', () => {
    const f = find('Slogan: “Freight without the fog”\nTone: Direct\nMission: m', 'slogan');
    expect(f?.value).toBe('Freight without the fog');
  });

  it('skips a field the AI declined to answer', () => {
    expect(find('Slogan: N/A\nTone: Direct\nMission: m', 'slogan')).toBeUndefined();
    expect(find('Slogan: none\nTone: Direct\nMission: m', 'slogan')).toBeUndefined();
  });

  it('is order-independent, because an LLM reorders labels', () => {
    const keys = parseStrategyBrief('Tone: Direct\nMission: m\nIndustry: Logistics')
      .fields.map((f) => f.key);
    expect(keys).toContain('tone');
    expect(keys).toContain('mission');
    expect(keys).toContain('industry');
  });

  it('hands back what it did not recognise instead of swallowing it', () => {
    const parsed = parseStrategyBrief(
      'Tone: Direct\nMission: m\nAudience: Startups\n\nHere is some extra thinking.',
    );
    expect(parsed.residualProse).toContain('extra thinking');
  });

  it('never throws on text that is not a brief at all', () => {
    const parsed = parseStrategyBrief('just some words');
    expect(parsed.fields).toEqual([]);
    expect(parsed.residualProse).toBe('just some words');
  });
});

describe('applyStrategyFields', () => {
  it('writes only the fields given and leaves the rest alone', () => {
    const before = { ...EMPTY_STRATEGY, mission: 'kept' };
    const next = applyStrategyFields(before, [
      { key: 'tone', value: 'direct', display: 'Direct', isOther: false },
    ]);
    expect(next.tone).toBe('direct');
    expect(next.mission).toBe('kept');
    // Pure: the original is untouched.
    expect(before.tone).toBe('');
  });
});

describe('labelOf', () => {
  it('names a field the way the board names it', () => {
    expect(labelOf('summary')).toBe('Brand summary');
    expect(labelOf('style')).toBe('Visual style');
  });
});
