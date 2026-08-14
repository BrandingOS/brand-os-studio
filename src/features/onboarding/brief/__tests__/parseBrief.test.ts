/**
 * The brief parser — the other half of the two-way contract.
 *
 * The two claims that matter: prose must NOT be mistaken for a brief (a false
 * positive shreds someone's paragraph into fields), and a suggested palette
 * must never be parsed as the brand's actual colours.
 */
import { describe, it, expect } from 'vitest';
import { looksLikeBrief, parseBrief } from '../parseBrief';
import { BRIEF_LABELS, buildBriefPrompt } from '../prompt';

const FULL = `Brand summary: Northwind builds considered family homes.
Industry: Real Estate
Products / Services: New homes, Renovations, Aftercare
Audience: Second-time buyers.
Positioning: Premium without ostentation.
Slogan: Homes that hold their value
Personality: Trustworthy, Sophisticated
Tone: Calm
Visual style: Modern, Elegant
Core values: Craftsmanship, Integrity, Heritage
Colors: #1B4D3E, #E8DCC8
Fonts: Söhne + Tiempos`;

const PROSE = `We're a small builder in the north-west. We've been going since 2009,
and the thing we care about most is that a house still feels right in twenty years.
Our tone is calm, I suppose. We work with second-time buyers mostly.`;

describe('detection', () => {
  it('recognises the brief we asked for', () => {
    expect(looksLikeBrief(FULL)).toBe(true);
  });

  it('does NOT fire on ordinary prose', () => {
    // The expensive failure: prose shredded into fields instead of being read.
    expect(looksLikeBrief(PROSE)).toBe(false);
  });

  it('does not fire on one or two stray labels inside a paragraph', () => {
    expect(looksLikeBrief('Our tone: calm. Industry: we do houses, sort of.')).toBe(false);
  });

  it('fires once three labels open their own lines', () => {
    expect(looksLikeBrief('Industry: Retail\nTone: Warm\nAudience: Everyone')).toBe(true);
  });

  it('is false for empty input', () => {
    expect(looksLikeBrief('')).toBe(false);
  });
});

describe('parsing', () => {
  it('reads every field', () => {
    const b = parseBrief(FULL);
    expect(b.summary).toBe('Northwind builds considered family homes.');
    expect(b.industry).toBe('Real Estate');
    expect(b.products).toEqual(['New homes', 'Renovations', 'Aftercare']);
    expect(b.slogan).toBe('Homes that hold their value');
    expect(b.personality).toEqual(['Trustworthy', 'Sophisticated']);
    expect(b.tone).toBe('Calm');
    expect(b.style).toEqual(['Modern', 'Elegant']);
    expect(b.values).toEqual(['Craftsmanship', 'Integrity', 'Heritage']);
    expect(b.colors).toEqual(['#1B4D3E', '#E8DCC8']);
    expect(b.fonts).toEqual(['Söhne', 'Tiempos']);
  });

  it('takes only ONE tone — a brand with two tones has none', () => {
    expect(parseBrief('Industry: Retail\nTone: Calm, Direct\nAudience: x').tone).toBe('Calm');
  });

  it('tolerates a different order', () => {
    const b = parseBrief('Tone: Warm\nIndustry: Retail\nAudience: Everyone');
    expect(b.tone).toBe('Warm');
    expect(b.industry).toBe('Retail');
  });

  it('tolerates casing and slash spacing', () => {
    const b = parseBrief('industry: Retail\nProducts/Services: A, B\nTone: Warm');
    expect(b.industry).toBe('Retail');
    expect(b.products).toEqual(['A', 'B']);
  });

  it('keeps an out-of-vocabulary answer verbatim for the normaliser', () => {
    expect(parseBrief('Industry: Other: Taxidermy\nTone: Warm\nAudience: x').industry)
      .toBe('Other: Taxidermy');
  });

  it('hands residual prose back rather than discarding it', () => {
    const partial = `Industry: Retail\nTone: Warm\nAudience: Everyone\n\nWe also do custom work for galleries.`;
    expect(parseBrief(partial).residualProse).toContain('custom work for galleries');
  });

  it('never throws on junk', () => {
    expect(() => parseBrief('::::\n\n\n')).not.toThrow();
  });
});

describe('the two modes of colours and fonts', () => {
  const withDirections = `Industry: Retail
Tone: Warm
Colors: Directions:
Deep Forest — #1B4D3E #E8DCC8 #C9A227
Warm Stone — #8A7F6D #EFEAE1 #3B3A36
Sea Glass — #7FA8A0 #F2F0EA #24403B
Fonts: Directions:
Söhne + Tiempos
Inter + Lora`;

  it('parses offered palettes as DIRECTIONS, not as the brand’s colours', () => {
    const b = parseBrief(withDirections);
    expect(b.colors).toBeUndefined();
    expect(b.colorDirections).toHaveLength(3);
    expect(b.colorDirections?.[0]).toEqual({
      name: 'Deep Forest',
      hexes: ['#1B4D3E', '#E8DCC8', '#C9A227'],
    });
  });

  it('parses offered fonts as PAIRINGS, not as the brand’s typefaces', () => {
    const b = parseBrief(withDirections);
    expect(b.fonts).toBeUndefined();
    expect(b.fontDirections).toEqual([
      { heading: 'Söhne', body: 'Tiempos' },
      { heading: 'Inter', body: 'Lora' },
    ]);
  });

  it('expands 3-digit hex', () => {
    const b = parseBrief('Industry: Retail\nTone: Warm\nColors: #ABC, #123456');
    expect(b.colors).toEqual(['#AABBCC', '#123456']);
  });
});

describe('the prompt and the parser cannot disagree', () => {
  it('every label the prompt emits is a label the parser recognises', () => {
    const prompt = buildBriefPrompt('Northwind');
    for (const label of BRIEF_LABELS) {
      expect(prompt).toContain(`${label}:`);
    }
  });

  it('the prompt inlines the controlled options', () => {
    const prompt = buildBriefPrompt('Northwind');
    expect(prompt).toContain('Real Estate');
    expect(prompt).toContain('Brutalist');
    expect(prompt).toContain('PLAIN TEXT ONLY');
    expect(prompt).toContain('Northwind');
  });
});

describe('evidence outranks suggestion in the prompt itself', () => {
  // The complaint this fixes: a brand that had just uploaded its logo and
  // palette was still being handed a prompt asking for three palette
  // DIRECTIONS, so the AI confidently proposed colours that contradicted the
  // brand's own artwork.
  it('states known colours as fact and forbids alternatives', () => {
    const prompt = buildBriefPrompt('Northwind', { colors: ['#1B4D3E', '#E8DCC8'] });
    expect(prompt).toContain('ALREADY uses these colours');
    expect(prompt).toContain('#1B4D3E, #E8DCC8');
    expect(prompt).not.toMatch(/3 palette directions/);
  });

  it('states known typefaces as fact and forbids alternatives', () => {
    const prompt = buildBriefPrompt('Northwind', { fonts: ['Söhne', 'Tiempos'] });
    expect(prompt).toContain('ALREADY uses these typefaces');
    expect(prompt).toContain('Söhne, Tiempos');
    expect(prompt).not.toMatch(/3 pairings/);
  });

  it('treats an existing logo as a settled identity, not a brief for a redesign', () => {
    const prompt = buildBriefPrompt('Northwind', { hasLogo: true });
    expect(prompt).toContain('already has a logo');
    expect(prompt).toContain('do not propose a redesign');
  });

  it('still asks for directions when the brand genuinely has nothing', () => {
    const prompt = buildBriefPrompt('Northwind');
    expect(prompt).toContain('3 palette directions');
    expect(prompt).toContain('3 pairings');
    expect(prompt).not.toContain('ALREADY uses');
  });

  it('an answer to the evidence-led prompt still parses', () => {
    // The labels must not drift when the two modes swap.
    const prompt = buildBriefPrompt('Northwind', { colors: ['#1B4D3E'] });
    for (const label of BRIEF_LABELS) expect(prompt).toContain(`${label}:`);
  });
});
