import { describe, expect, it } from 'vitest';
import { buildStrategyPrompt, STRATEGY_LABELS, LABEL_BY_KEY } from '../strategyPrompt';
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

  it('states what the brand already decided as fact, not as a question', () => {
    const prompt = buildStrategyPrompt('Northwind', {
      strategy: { ...EMPTY_STRATEGY, mission: 'Make shipping boring.', tone: 'direct' },
    });
    expect(prompt).toContain('ALREADY decided');
    expect(prompt).toContain('Mission: Make shipping boring.');
    // Stored as an id, shown as the word a person reads.
    expect(prompt).toContain('Tone: Direct');
  });

  it('says nothing about settled answers when the brand has none', () => {
    expect(buildStrategyPrompt('Northwind')).not.toContain('ALREADY decided');
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
