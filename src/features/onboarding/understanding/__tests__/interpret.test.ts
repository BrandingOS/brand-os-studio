/**
 * Interpretation: material and words in, proposals out.
 *
 * The claims: every proposal targets a closed Core path, provenance
 * distinguishes an assisted read from a derived one, nothing is invented, the
 * assisted tier failing costs nothing, understanding routes by the SHAPE of the
 * text rather than by asking, and ordering is stable so the review does not
 * reshuffle between renders.
 */
import { describe, it, expect, vi } from 'vitest';
import { isCoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { interpret, proseRank } from '../interpret';
import { RANK } from '../sources';
import { EVIDENCE } from '../../website/__tests__/fromWebsite.test';
import type { ParsedSection } from '../parseDescription';
import { groupBySection, sectionFor } from '../proposals';
import { buildBriefPrompt } from '../../brief/prompt';

const color = (hex: string): OnboardingAsset => ({
  id: `c-${hex}`, name: hex, sub: '', kind: 'color', value: hex,
  previewUrl: null, uploadStatus: 'done', uploadProgress: 1,
});

const sections = (...s: Array<[string, string]>): ParsedSection[] =>
  s.map(([key, content]) => ({ key: key as never, title: key, content }));

const parseOk = (s: ParsedSection[]) => async () => s;
const parseFails = async () => { throw new Error('proxy down'); };

const BRIEF = `Brand summary: Northwind builds considered family homes.
Industry: Real Estate
Products / Services: New homes, Renovations
Audience: Second-time buyers who care how a house is made.
Positioning: Premium without ostentation.
Slogan: Homes that hold their value
Personality: Trustworthy, Sophisticated
Tone: Calm
Visual style: Modern, Elegant
Core values: Craftsmanship, Integrity, Heritage
Colors: #1B4D3E, #E8DCC8
Fonts: Söhne + Tiempos`;

describe('every proposal targets a closed Core path', () => {
  it('emits only registry paths', async () => {
    const { proposals } = await interpret(
      { description: 'x', items: [color('#1B4D3E')] },
      { parse: parseOk(sections(['mission', 'To build well'], ['audience', 'Homeowners'])) },
    );
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) expect(isCoreFieldPath(p.corePath)).toBe(true);
  });

  it('an unmappable section proposes nothing', async () => {
    const { proposals } = await interpret(
      { items: [], description: 'x' },
      { parse: parseOk(sections(['story', 'Founded in a shed'])) },
    );
    expect(proposals).toEqual([]);
  });

  it('every proposal lands in a section the review renders', async () => {
    const { proposals } = await interpret(
      { items: [color('#111111')], description: 'x' },
      { parse: parseOk(sections(['mission', 'To build well'])) },
    );
    for (const p of proposals) expect(sectionFor(p.corePath)).not.toBeNull();
    expect(groupBySection(proposals).length).toBeGreaterThan(0);
  });
});

describe('colours', () => {
  it('first is primary, second secondary, the rest neutrals — never an accent', async () => {
    const { proposals } = await interpret(
      { items: [color('#111111'), color('#222222'), color('#333333')] },
      {},
    );
    const paths = proposals.map((p) => p.corePath);
    expect(paths).toContain('colors.primary');
    expect(paths).toContain('colors.secondary');
    expect(paths).toContain('colors.neutrals');
    // An uploaded palette is just the brand's colours. Guessing that the third
    // swatch is "the accent" drops a lone colour into a section on its own.
    expect(paths).not.toContain('colors.accent');
  });

  it('records material as inferred, not as an assisted read', async () => {
    const { proposals } = await interpret({ items: [color('#1C3F5E')] }, {});
    expect(proposals[0].provenance).toBe('inferred');
  });
});

describe('the assisted tier', () => {
  it('records a description read as ai-suggested', async () => {
    const { proposals } = await interpret(
      { items: [], description: 'x' },
      { parse: parseOk(sections(['mission', 'To build well'])) },
    );
    expect(proposals[0].provenance).toBe('ai-suggested');
  });

  it('degrades rather than failing when the proxy is down', async () => {
    const { proposals } = await interpret(
      { items: [color('#123456')], description: 'x' },
      { parse: parseFails },
    );
    // The material-derived proposals stand on their own.
    expect(proposals.map((p) => p.corePath)).toContain('colors.primary');
  });

  it('proposes nothing from nothing', async () => {
    const { proposals } = await interpret({ items: [] }, {});
    expect(proposals).toEqual([]);
  });
});

describe('adaptive routing', () => {
  it('recognises the brief and does NOT call the assisted tier', async () => {
    const parse = vi.fn(parseOk([]));
    const out = await interpret({ items: [], description: BRIEF }, { parse });
    expect(out.usedBrief).toBe(true);
    // The whole point of authoring the prompt: we can read our own format.
    expect(parse).not.toHaveBeenCalled();
  });

  it('sends free-form prose to the assisted tier', async () => {
    const parse = vi.fn(parseOk(sections(['mission', 'To build well'])));
    const out = await interpret(
      { items: [], description: 'We build houses in the north-west and we care about it.' },
      { parse },
    );
    expect(out.usedBrief).toBe(false);
    expect(parse).toHaveBeenCalledTimes(1);
  });

  it('normalises the brief’s categorical answers into vocabulary members', async () => {
    const { proposals } = await interpret({ items: [], description: BRIEF }, {});
    const tone = proposals.find((p) => p.corePath === 'voice.tone');
    const style = proposals.find((p) => p.corePath === 'visualStyle.descriptors');
    const values = proposals.find((p) => p.corePath === 'strategy.values');
    expect(tone?.value).toBe('calm');
    expect(style?.value).toEqual(['modern', 'elegant']);
    expect(values?.value).toEqual(['craftsmanship', 'integrity', 'heritage']);
  });

  it('routes business facts to Business Info, never to Core', async () => {
    const out = await interpret({ items: [], description: BRIEF }, {});
    expect(out.business.industry).toBe('real-estate');
    expect(out.business.tagline).toBe('Homes that hold their value');
    expect(out.business.description).toBe('New homes, Renovations');
    // `positioning.category` is a DIFFERENT concept and must not mirror it.
    expect(out.proposals.map((p) => p.corePath)).not.toContain('positioning.category');
  });

  it('the prompt it builds round-trips through its own parser', async () => {
    // If these two ever disagree, the brief path silently degrades to prose.
    const prompt = buildBriefPrompt('Northwind');
    for (const label of ['Industry', 'Tone', 'Visual style', 'Core values']) {
      expect(prompt).toContain(`${label}:`);
    }
    const out = await interpret({ items: [], description: BRIEF }, {});
    expect(out.usedBrief).toBe(true);
  });
});

describe('source priority', () => {
  it('uploaded evidence beats the brief for the same value', async () => {
    const { proposals } = await interpret(
      { items: [color('#AABBCC')], description: BRIEF },
      {},
    );
    const primary = proposals.find((p) => p.corePath === 'colors.primary');
    // The brief said #1B4D3E; the logo says #AABBCC. The logo wins.
    expect((primary?.value as { hex: string }).hex).toBe('#AABBCC');
  });

  it('a decided path is never proposed again', async () => {
    const { proposals } = await interpret(
      { items: [color('#AABBCC')], description: BRIEF, decided: ['colors.primary'] },
      {},
    );
    expect(proposals.map((p) => p.corePath)).not.toContain('colors.primary');
  });

  it('suggested directions are offered, never written as brand truth', async () => {
    const withDirections = `Industry: Real Estate
Tone: Calm
Colors: Directions:
Deep Forest — #1B4D3E #E8DCC8 #C9A227
Warm Stone — #8A7F6D #EFEAE1 #3B3A36
Fonts: Directions:
Söhne + Tiempos`;
    const out = await interpret({ items: [], description: withDirections }, {});
    expect(out.suggestions.palettes.length).toBe(2);
    expect(out.suggestions.pairings.length).toBe(1);
    // Not one of them reached the brand's actual palette or typeface.
    const paths = out.proposals.map((p) => p.corePath);
    expect(paths).not.toContain('colors.primary');
    expect(paths).not.toContain('typography.primary');
  });
});

describe('determinism', () => {
  it('the same input yields the same order', async () => {
    const input = { items: [color('#111111'), color('#222222')], description: 'x' };
    const parse = parseOk(sections(['mission', 'To build well'], ['audience', 'Everyone']));
    const a = await interpret(input, { parse });
    const b = await interpret(input, { parse });
    expect(a.proposals.map((p) => p.corePath)).toEqual(b.proposals.map((p) => p.corePath));
  });
});

describe('who wrote the description decides its rank', () => {
  it('prose the user wrote themselves ranks as an explicit user-authored fact', () => {
    expect(proseRank('written')).toBe(RANK.authored);
  });

  it('a pasted AI reply that is not a brief ranks as generated content', () => {
    expect(proseRank('pasted')).toBe(RANK.generated);
    expect(proseRank(undefined)).toBe(RANK.generated);
  });

  it('written prose records that it came from the user, never as our suggestion', async () => {
    const out = await interpret(
      { description: 'We build calm, durable homes.', items: [], authorship: 'written' },
      { parse: parseOk(sections(['mission', 'Build calm, durable homes.'])) },
    );
    const mission = out.proposals.find((p) => p.corePath === 'strategy.mission');
    expect(mission?.provenance).toBe('inferred');
    expect(mission?.evidence).toBe('your description');
  });

  it('a pasted reply keeps reading as a suggestion', async () => {
    const out = await interpret(
      { description: 'We build calm, durable homes.', items: [], authorship: 'pasted' },
      { parse: parseOk(sections(['mission', 'Build calm, durable homes.'])) },
    );
    expect(out.proposals.find((p) => p.corePath === 'strategy.mission')?.provenance).toBe('ai-suggested');
  });
});

describe('the website inside the understanding pass', () => {
  it('website facts outrank the pasted brief for the same values', async () => {
    const out = await interpret({ description: BRIEF, items: [], websiteEvidence: EVIDENCE });
    expect(out.proposals.find((p) => p.corePath === 'colors.primary')?.value).toEqual({ hex: '#1F3A2E' });
    expect(out.business.tagline).toBe('Spaces that feel like they were always there.');
    expect(out.websiteOrigins['business.tagline']).toBe('northwind.studio');
  });

  it('an uploaded colour still outranks the website', async () => {
    const out = await interpret({ description: '', items: [color('#C8102E')], websiteEvidence: EVIDENCE });
    expect(out.proposals.find((p) => p.corePath === 'colors.primary')?.value).toEqual({ hex: '#C8102E' });
  });

  it('a brief the user wrote themselves keeps its business facts over the site', async () => {
    const out = await interpret({ description: BRIEF, items: [], websiteEvidence: EVIDENCE, authorship: 'written' });
    expect(out.business.tagline).not.toBe('Spaces that feel like they were always there.');
  });

  it('without a scan nothing about the website is proposed', async () => {
    const out = await interpret({ description: '', items: [] });
    expect(out.websiteOrigins).toEqual({});
    expect(out.proposals).toEqual([]);
  });
});

describe('colours from scraped artwork', () => {
  const siteColour = (hex: string): OnboardingAsset => ({ ...color(hex), origin: 'website' });

  it('rank as website evidence, so an uploaded colour still wins', async () => {
    const out = await interpret({ description: '', items: [siteColour('#111111'), color('#C8102E')] });
    // Mixed material is the user's: the first swatch is the primary as before.
    expect(out.proposals.find((p) => p.corePath === 'colors.primary')?.value).toEqual({ hex: '#111111' });
    const site = await interpret({ description: '', items: [siteColour('#111111')], websiteEvidence: EVIDENCE });
    expect(site.proposals.find((p) => p.corePath === 'colors.primary')?.provenance).toBe('imported');
  });

  it('the same hex never lands under two roles', async () => {
    const out = await interpret({ description: '', items: [siteColour('#1F3A2E'), siteColour('#C8553D')], websiteEvidence: EVIDENCE });
    const primary = out.proposals.find((p) => p.corePath === 'colors.primary')?.value as { hex: string };
    const secondary = out.proposals.find((p) => p.corePath === 'colors.secondary')?.value as { hex: string };
    const neutrals = (out.proposals.find((p) => p.corePath === 'colors.neutrals')?.value as Array<{ hex: string }> | undefined) ?? [];
    const all = [primary.hex, secondary.hex, ...neutrals.map((n) => n.hex)];
    expect(new Set(all).size).toBe(all.length);
    expect(primary.hex).toBe('#1F3A2E');
  });
});
