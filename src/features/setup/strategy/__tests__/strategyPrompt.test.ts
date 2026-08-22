import { describe, expect, it } from 'vitest';
import {
  buildStrategyPrompt,
  buildSectionPrompt,
  STRATEGY_LABELS,
  LABEL_BY_KEY,
  PROMPT_SENTINELS,
  ALL_STRATEGY_KEYS,
  ASKS,
} from '../strategyPrompt';
import { parseStrategyBrief, looksLikeStrategyBrief } from '../parseStrategyBrief';
import { STRATEGY_CARDS } from '../../data/strategyCards';
import { EMPTY_STRATEGY } from '../../data/mockBrand';

describe('the strategy prompt and the parser cannot disagree', () => {
  it('emits every label the parser recognises', () => {
    const prompt = buildStrategyPrompt('Northwind');
    for (const label of STRATEGY_LABELS) expect(prompt).toContain(`${label}:`);
  });

  it('covers all eleven strategy cards, and only those', () => {
    expect(STRATEGY_LABELS).toHaveLength(STRATEGY_CARDS.length);
    for (const card of STRATEGY_CARDS) {
      expect(LABEL_BY_KEY[card.key]).toBeTruthy();
    }
  });

  // The whole reason this is a SEPARATE prompt from onboarding's: a paste into
  // the Brand Strategy section must not be able to repaint the brand.
  it('never asks for colours, fonts or a logo', () => {
    const prompt = buildStrategyPrompt('Northwind');
    expect(prompt).not.toMatch(/\bColors:/);
    expect(prompt).not.toMatch(/\bFonts:/);
    expect(prompt).toContain('Do not suggest colours, typefaces, or a logo');
  });

  it('inlines the controlled options from the vocabularies', () => {
    const prompt = buildStrategyPrompt('Northwind');
    expect(prompt).toContain('Real Estate'); // industry
    expect(prompt).toContain('Brutalist'); // style
    expect(prompt).toContain('Small businesses'); // audience — new
    expect(prompt).toContain('Challenger'); // positioning — new
  });

  // An answer the user is NOT asking about is context, not a question: the AI
  // is told to stay consistent with it rather than to produce a replacement.
  it('hands unasked answers over as settled context', () => {
    const prompt = buildStrategyPrompt('Northwind', {
      strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.', tone: 'direct' },
      ask: ['summary', 'industry'],
    });
    expect(prompt).toContain('ALREADY decided');
    expect(prompt).toContain('Mission: Make shipping boring.');
    // Stored as an id, shown as the word a person reads.
    expect(prompt).toContain('Tone: Direct');
    // And it does not ask for them again.
    expect(prompt).not.toMatch(/^Mission: 1 sentence/m);
  });

  it('asks about a field the user selected even when it already has a value', () => {
    const prompt = buildStrategyPrompt('Northwind', {
      strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.' },
      ask: ['mission'],
    });
    expect(prompt).toMatch(/^Mission: 1 sentence/m);
    expect(prompt).not.toContain('ALREADY decided');
  });

  it('asks only about the selected fields', () => {
    const prompt = buildStrategyPrompt('Northwind', { ask: ['tone', 'mission'] });
    expect(prompt).toMatch(/^Tone:/m);
    expect(prompt).toMatch(/^Mission:/m);
    expect(prompt).not.toMatch(/^Industry:/m);
    expect(prompt).not.toMatch(/^Slogan:/m);
  });

  it('says nothing about settled answers when the brand has none', () => {
    expect(buildStrategyPrompt('Northwind')).not.toContain('ALREADY decided');
  });

  // The sentinels are how the parser refuses a pasted prompt. If one is
  // reworded out of the prompt and left in the list, the guard silently
  // weakens — so every sentinel must really be in what we build.
  it('every prompt sentinel is genuinely in the prompt', () => {
    const prompt = buildStrategyPrompt('Northwind');
    for (const sentinel of PROMPT_SENTINELS) expect(prompt).toContain(sentinel);
  });

  it('every ask is genuinely in the prompt, so the parser can recognise one', () => {
    const prompt = buildStrategyPrompt('Northwind');
    for (const key of ALL_STRATEGY_KEYS) expect(prompt).toContain(ASKS[key]);
  });

  it('tells the AI to replace the instruction rather than repeat it', () => {
    expect(buildStrategyPrompt('Northwind')).toContain('REPLACE the');
  });
});

describe('buildSectionPrompt', () => {
  it('asks for one section, as a paragraph with no label to parse', () => {
    const p = buildSectionPrompt('Northwind', 'Brand promise');
    expect(p).toContain('"Brand promise"');
    expect(p).toContain('Northwind');
    expect(p).toContain('no label');
  });

  it('carries what the brand already says, so the paragraph stays consistent', () => {
    const p = buildSectionPrompt('Northwind', 'Brand promise', {
      ...EMPTY_STRATEGY,
      mission: 'Make shipping boring.',
    });
    expect(p).toContain('Mission: Make shipping boring.');
  });

  it('falls back to a placeholder rather than an empty title', () => {
    expect(buildSectionPrompt('Northwind', '  ')).toContain('this part of the brand');
  });

  it('falls back to a placeholder rather than an empty name', () => {
    expect(buildStrategyPrompt('   ')).toContain('[BRAND NAME]');
  });

  // The round trip: what the prompt asks for is what the parser reads back.
  it('a well-formed answer to this prompt parses into every field', () => {
    const reply = [
      'Brand summary: Northwind moves freight for small importers.',
      'Industry: Logistics',
      'Products / Services: Freight forwarding, Customs clearance, Warehousing',
      'Audience: Small businesses',
      'Positioning: Challenger',
      'Mission: To make shipping boring.',
      'Personality: Reliable, Direct, Confident',
      'Tone: Direct',
      'Visual style: Minimal, Technical',
      'Core values: Transparency, Quality, Care',
      'Slogan: Freight without the fog',
    ].join('\n');

    expect(looksLikeStrategyBrief(reply)).toBe(true);
    const parsed = parseStrategyBrief(reply);
    expect(parsed.fields.map((f) => f.key).sort()).toEqual(
      STRATEGY_CARDS.map((c) => c.key).sort(),
    );
    expect(parsed.residualProse).toBe('');
  });
});
