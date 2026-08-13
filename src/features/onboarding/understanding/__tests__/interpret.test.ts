/**
 * Interpretation: material and words in, proposals out.
 *
 * The claims: every proposal targets a closed Core path, provenance
 * distinguishes an assisted read from a derived one, nothing is invented, the
 * assisted tier failing costs nothing, and ordering is stable so the review
 * does not reshuffle between renders.
 */
import { describe, it, expect } from 'vitest';
import { isCoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';
import { interpret, type StartingDirection } from '../interpret';
import type { ParsedSection } from '../parseDescription';
import { groupBySection, sectionFor } from '../proposals';

const color = (hex: string): OnboardingAsset => ({
  id: `c-${hex}`, name: hex, sub: '', kind: 'color', value: hex,
  previewUrl: null, uploadStatus: 'done', uploadProgress: 1,
});

const sections = (...s: Array<[string, string]>): ParsedSection[] =>
  s.map(([key, content]) => ({ key: key as never, title: key, content }));

const parseOk = (s: ParsedSection[]) => async () => s;
const parseFails = async () => { throw new Error('proxy down'); };

describe('every proposal targets a closed Core path', () => {
  it('emits only registry paths', async () => {
    const out = await interpret({
      description: 'x',
      items: [color('#1C3F5E'), color('#E8623A'), color('#F0EDE4')],
    }, { parse: parseOk(sections(['mission', 'Do the thing'], ['voice', 'Direct'])) });

    expect(out.length).toBeGreaterThan(0);
    for (const p of out) expect(isCoreFieldPath(p.corePath)).toBe(true);
  });

  it('drops a parsed section with no Core path rather than inventing one', async () => {
    const out = await interpret(
      { items: [], description: 'x' },
      { parse: parseOk(sections(['story', 'Once upon a time'], ['custom', 'Brand promise'])) },
    );
    // `story` and custom headings are real content with no Core address. They
    // are not proposed — and not silently turned into something else.
    expect(out).toHaveLength(0);
  });
});

describe('provenance separates what we read from what we derived', () => {
  it('description-derived values are ai-suggested', async () => {
    const out = await interpret({ items: [], description: 'x' }, {
      parse: parseOk(sections(['mission', 'Ship it'])),
    });
    expect(out[0]).toMatchObject({
      corePath: 'strategy.mission',
      provenance: 'ai-suggested',
      evidence: 'your description',
    });
  });

  it('material-derived values are inferred', async () => {
    const out = await interpret({ items: [color('#1C3F5E')] }, {});
    expect(out[0]).toMatchObject({
      corePath: 'colors.primary',
      provenance: 'inferred',
      evidence: 'your artwork',
    });
  });

  it('every proposal carries evidence — nothing comes from nothing', async () => {
    const out = await interpret(
      { items: [color('#1C3F5E')], description: 'x' },
      { parse: parseOk(sections(['voice', 'Calm'])) },
    );
    for (const p of out) expect(p.evidence.length).toBeGreaterThan(0);
  });
});

describe('colours', () => {
  it('first is primary, second secondary, the rest neutrals — never an accent', async () => {
    const out = await interpret(
      { items: [color('#111111'), color('#222222'), color('#333333'), color('#444444')] },
      {},
    );
    const paths = out.map((p) => p.corePath);
    expect(paths).toContain('colors.primary');
    expect(paths).toContain('colors.secondary');
    expect(paths).toContain('colors.neutrals');
    // Guessing that the third swatch is "the accent" drops a lone colour into
    // that section on its own.
    expect(paths).not.toContain('colors.accent');
  });

  it('a single colour proposes only a primary', async () => {
    const out = await interpret({ items: [color('#111111')] }, {});
    expect(out.map((p) => p.corePath)).toEqual(['colors.primary']);
  });
});

describe('values become a list, not a run-on sentence', () => {
  it('splits on the separators people actually type', async () => {
    const out = await interpret({ items: [], description: 'x' }, {
      parse: parseOk(sections(['values', 'Honest, Direct · Useful'])),
    });
    expect(out[0].value).toEqual(['Honest', 'Direct', 'Useful']);
  });

  it('a sentence with no separators stays one value', async () => {
    const out = await interpret({ items: [], description: 'x' }, {
      parse: parseOk(sections(['values', 'We do the right thing'])),
    });
    expect(out[0].value).toEqual(['We do the right thing']);
  });
});

describe('degradation', () => {
  it('the assisted tier failing costs only description-derived proposals', async () => {
    const out = await interpret(
      { items: [color('#1C3F5E')], description: 'a real description' },
      { parse: parseFails },
    );
    // Material-derived proposals survive; the flow never blocks on the tier.
    expect(out.map((p) => p.corePath)).toEqual(['colors.primary']);
  });

  it('nothing at all produces nothing, without throwing', async () => {
    await expect(interpret({ items: [] }, {})).resolves.toEqual([]);
  });
});

describe('a chosen direction', () => {
  const direction: StartingDirection = {
    id: 'quiet-technical',
    title: 'Quiet technical',
    qualities: 'Precision · restraint · neutral typography',
    colors: ['#1C3F5E', '#8BA6B8'],
    fontFamily: 'Inter',
    fontWeight: 500,
    tone: 'Precise and unhurried',
  };

  it('proposes colour, type and voice together', async () => {
    const out = await interpret({ items: [], direction }, {});
    const paths = out.map((p) => p.corePath);
    expect(paths).toContain('colors.primary');
    expect(paths).toContain('typography.primary');
    expect(paths).toContain('voice.tone');
  });

  it('names the direction as its evidence, in the user’s words', async () => {
    const out = await interpret({ items: [], direction }, {});
    expect(out[0].evidence).toBe('the quiet technical direction');
  });

  it('a direction wins over extraction — it is what the user just chose', async () => {
    const out = await interpret({ items: [color('#FF0000')], direction }, {});
    const primary = out.find((p) => p.corePath === 'colors.primary');
    expect((primary!.value as { hex: string }).hex).toBe('#1C3F5E');
  });
});

describe('stability and shape', () => {
  it('is deterministic for the same input', async () => {
    const input = { items: [color('#111111'), color('#222222')], description: 'x' };
    const parse = parseOk(sections(['mission', 'A'], ['voice', 'B']));
    const a = await interpret(input, { parse });
    const b = await interpret(input, { parse });
    expect(a).toEqual(b);
  });

  it('never proposes the same path twice', async () => {
    const direction: StartingDirection = {
      id: 'd', title: 'Warm modern', qualities: '', colors: ['#AAA111'],
      fontFamily: 'Inter', fontWeight: 400, tone: 'Warm',
    };
    const out = await interpret({ items: [], direction, description: 'x' }, {
      parse: parseOk(sections(['voice', 'Something else'])),
    });
    const paths = out.map((p) => p.corePath);
    expect(new Set(paths).size).toBe(paths.length);
  });
});

describe('section grouping — only what exists is rendered', () => {
  it('places each path in its section', () => {
    expect(sectionFor('logos.primary')).toBe('identity');
    expect(sectionFor('colors.primary')).toBe('visual');
    expect(sectionFor('typography.primary')).toBe('visual');
    expect(sectionFor('strategy.mission')).toBe('thinking');
    expect(sectionFor('voice.tone')).toBe('thinking');
  });

  it('omits empty sections entirely — no "Type: none" rows', async () => {
    const out = await interpret({ items: [], description: 'x' }, {
      parse: parseOk(sections(['mission', 'Ship it'])),
    });
    const groups = groupBySection(out);
    expect(groups.map((g) => g.section)).toEqual(['thinking']);
  });

  it('keeps sections in their fixed order regardless of proposal order', async () => {
    const out = await interpret(
      { items: [color('#111111')], description: 'x' },
      { parse: parseOk(sections(['mission', 'Ship it'])) },
    );
    expect(groupBySection(out).map((g) => g.section)).toEqual(['visual', 'thinking']);
  });
});
