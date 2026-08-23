import { describe, expect, it } from 'vitest';
import {
  parseBrandingBrief,
  paletteToGroups,
  looksLikeBrandingPrompt,
} from '../parseBrandingBrief';
import { buildBrandingPrompt } from '../brandingPrompt';
import { buildStrategyPrompt } from '../strategyPrompt';
import { EMPTY_STRATEGY } from '../../data/mockBrand';

const REPLY = [
  'Brand summary: Northwind moves freight for small importers.',
  'Industry: Logistics',
  'Mission: To make shipping boring.',
  'Tone: Direct',
  'Colors: #1B4D3E #E8DCC8 #C05621 #F4F1EA',
  'Fonts: Playfair Display + Source Sans Pro',
].join('\n');

describe('parseBrandingBrief', () => {
  it('parses strategy, palette and pairing from one reply', () => {
    const parsed = parseBrandingBrief(REPLY);
    expect(parsed.strategy.map((f) => f.key)).toEqual([
      'summary',
      'industry',
      'mission',
      'tone',
    ]);
    expect(parsed.palette?.hexes).toEqual(['#1B4D3E', '#E8DCC8', '#C05621', '#F4F1EA']);
    expect(parsed.pairing).toEqual({ heading: 'Playfair Display', body: 'Source Sans Pro' });
    expect(parsed.problem).toBeUndefined();
  });

  // The strategy fields go through the SAME judgement as the strategy import —
  // one spot-check that the refusal layers really are wired through.
  it('refuses an instruction-shaped strategy value', () => {
    const parsed = parseBrandingBrief(
      'Industry: pick ONE from: Real Estate · Hospitality\nColors: #1B4D3E #E8DCC8',
    );
    expect(parsed.strategy).toEqual([]);
    expect(parsed.palette?.hexes).toHaveLength(2);
  });

  it('refuses its own prompt wholesale', () => {
    const parsed = parseBrandingBrief(buildBrandingPrompt('Northwind'));
    expect(parsed.problem).toBe('prompt');
    expect(parsed.strategy).toEqual([]);
    expect(parsed.palette).toBeUndefined();
  });

  it('refuses the strategy prompt too — either of ours pasted whole', () => {
    expect(parseBrandingBrief(buildStrategyPrompt('Northwind')).problem).toBe('prompt');
  });

  it('a prompt with settled context embedded is still refused', () => {
    const prompt = buildBrandingPrompt('Northwind', {
      strategy: { ...EMPTY_STRATEGY, mission: 'Ship.' },
      colors: { core: [{ hex: '#1B4D3E', name: 'Green' }], accent: [] },
      ask: ['fonts'],
    });
    expect(parseBrandingBrief(prompt).problem).toBe('prompt');
    expect(looksLikeBrandingPrompt(prompt)).toBe(true);
  });

  it('the echoed Colors instruction never becomes a palette', () => {
    const parsed = parseBrandingBrief(
      'Colors: the brand palette as 3–5 hex codes on one line, the primary colour first.\nFonts: Playfair Display + Source Sans Pro',
    );
    expect(parsed.palette).toBeUndefined();
    expect(parsed.pairing).toBeTruthy();
  });

  it('the echoed Fonts instruction never becomes a pairing', () => {
    const parsed = parseBrandingBrief(
      'Fonts: a Google Fonts pairing written as Heading Family + Body Family, with one + between the two.\nColors: #1B4D3E #E8DCC8',
    );
    expect(parsed.pairing).toBeUndefined();
    expect(parsed.palette).toBeTruthy();
  });

  it('the bare placeholder pairing is an echo, not a typeface', () => {
    expect(
      parseBrandingBrief('Fonts: Heading Family + Body Family\nColors: #1B4D3E #E8DCC8').pairing,
    ).toBeUndefined();
  });

  it('a sentence where a family should be is refused', () => {
    expect(
      parseBrandingBrief('Fonts: something elegant, maybe a serif? + Inter\nColors: #1B4D3E #E8DCC8')
        .pairing,
    ).toBeUndefined();
  });

  it('a single hex is not a palette', () => {
    expect(parseBrandingBrief('Colors: #1B4D3E\nTone: Direct').palette).toBeUndefined();
  });

  it('a swatch dump is capped at eight', () => {
    const many = Array.from({ length: 12 }, (_, i) => `#1B4D${(30 + i).toString(16).padStart(2, '0')}`).join(' ');
    expect(parseBrandingBrief(`Colors: ${many}\nTone: Direct`).palette?.hexes).toHaveLength(8);
  });

  it('all-instructions with nothing usable says "unanswered"', () => {
    const parsed = parseBrandingBrief(
      'Colors: the brand palette as 3–5 hex codes on one line, the primary colour first.\nTone: pick ONE from: Formal · Warm',
    );
    expect(parsed.problem).toBe('unanswered');
  });

  it('never throws on prose and hands it back as residual', () => {
    const parsed = parseBrandingBrief('just some words about the company');
    expect(parsed.strategy).toEqual([]);
    expect(parsed.residualProse).toBe('just some words about the company');
    expect(parsed.problem).toBeUndefined();
  });
});

describe('paletteToGroups', () => {
  it('puts the first three in Core and the rest in Accent, all named', () => {
    const groups = paletteToGroups({ hexes: ['#1B4D3E', '#E8DCC8', '#C05621', '#F4F1EA'] });
    expect(groups.core).toHaveLength(3);
    expect(groups.accent).toHaveLength(1);
    expect(groups.core[0].hex).toBe('#1B4D3E');
    for (const c of [...groups.core, ...groups.accent]) expect(c.name.trim()).toBeTruthy();
  });

  it('a three-colour palette has no accents', () => {
    const groups = paletteToGroups({ hexes: ['#111111', '#EEEEEE', '#C05621'] });
    expect(groups.core).toHaveLength(3);
    expect(groups.accent).toHaveLength(0);
  });

  it('deduplicates colliding colour names', () => {
    const groups = paletteToGroups({ hexes: ['#101010', '#111111'] });
    const names = [...groups.core, ...groups.accent].map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
