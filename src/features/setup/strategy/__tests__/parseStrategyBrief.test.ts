import { describe, expect, it } from 'vitest';
import {
  parseStrategyBrief,
  looksLikeStrategyBrief,
  looksLikeStrategyPrompt,
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

// ─────────────────────────────────────────────────────────────────────────
// Refusing what is not a reply.
//
// The regression that made this section unusable: the prompt is three inches
// from the paste box and every one of its lines is shaped like an answer.
// ─────────────────────────────────────────────────────────────────────────
describe('refusing the prompt', () => {
  it('recognises its own prompt and refuses the whole paste', async () => {
    const { buildStrategyPrompt } = await import('../strategyPrompt');
    const prompt = buildStrategyPrompt('Northwind');
    const parsed = parseStrategyBrief(prompt);
    expect(parsed.problem).toBe('prompt');
    expect(parsed.fields).toEqual([]);
  });

  it('refuses it even with the brand’s settled answers embedded', async () => {
    const { buildStrategyPrompt } = await import('../strategyPrompt');
    const prompt = buildStrategyPrompt('Northwind', {
      strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.' },
      ask: ['summary', 'industry'],
    });
    expect(parseStrategyBrief(prompt).problem).toBe('prompt');
  });

  // The exact line from the bug report.
  it('never stores an option list as an answer', () => {
    const parsed = parseStrategyBrief(
      [
        'Industry: pick ONE from: Real Estate · Hospitality · Food & Beverage · Retail',
        'Audience: pick ONE from: Everyday consumers · Families · Young adults',
        'Mission: 1 sentence on why the brand exists — not what it sells.',
        'Tone: pick ONE from: Formal · Conversational · Warm',
        'Core values: pick 3–5 from: Quality · Integrity · Innovation · Sustainability',
      ].join('\n'),
    );
    expect(parsed.fields).toEqual([]);
    expect(parsed.problem).toBe('unanswered');
  });

  it('refuses an instruction even when it is the only thing pasted', () => {
    const parsed = parseStrategyBrief(
      'Products / Services: comma-separated, 3–6 items.\nSlogan: a short line that could sit under the brand name. Omit if none fits.\nMission: 1 sentence on why the brand exists — not what it sells.',
    );
    expect(parsed.fields).toEqual([]);
    expect(parsed.problem).toBe('unanswered');
  });

  // The escape hatch stays open for a genuine word and shut to a sentence.
  it('keeps a real "Other" word but refuses an instruction through it', () => {
    const good = find('Industry: Other: Property Development\nTone: Direct\nMission: m', 'industry');
    expect(good?.value).toBe('Property Development');

    const bad = find('Industry: pick ONE from: Real Estate\nTone: Direct\nMission: m', 'industry');
    expect(bad).toBeUndefined();
  });

  it('refuses an "Other" that is a sentence rather than a word', () => {
    const f = find(
      'Industry: Other: we mostly do a bit of everything depending on the season and the client\nTone: Direct\nMission: m',
      'industry',
    );
    expect(f).toBeUndefined();
  });

  it('a real reply still parses cleanly beside all of that', () => {
    const parsed = parseStrategyBrief(
      'Industry: Logistics\nTone: Direct\nMission: To make shipping boring.',
    );
    expect(parsed.problem).toBeUndefined();
    expect(parsed.fields).toHaveLength(3);
  });

  it('a mixed paste keeps the answers and drops the instructions', () => {
    const parsed = parseStrategyBrief(
      [
        'Industry: Logistics',
        'Audience: pick ONE from: Everyday consumers · Families',
        'Mission: To make shipping boring.',
      ].join('\n'),
    );
    expect(parsed.fields.map((f) => f.key)).toEqual(['industry', 'mission']);
    // Something was recognised, so this is not a wholesale failure.
    expect(parsed.problem).toBeUndefined();
  });
});

describe('looksLikeStrategyBrief guards the same door', () => {
  it('is false for the prompt, however well-labelled it is', async () => {
    const { buildStrategyPrompt } = await import('../strategyPrompt');
    expect(looksLikeStrategyBrief(buildStrategyPrompt('Northwind'))).toBe(false);
  });
});
