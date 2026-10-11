import { describe, expect, it } from 'vitest';
import { contrastRatio } from '@/shared/brand/logoOnBackground';
import { hexToHsl } from '@/shared/color/colorEngine';
import { isCoreFieldPath } from '@/domain/brand/coreFieldPaths';
import {
  clearSpaceFor,
  findingsFor,
  isolateInk,
  measureInk,
  minWidthFor,
  sizedSvg,
  traitsFromMetrics,
} from '../engine/logoRead';
import { allowedHue, cmykString, familyOf, nudgePalette, buildPalette, swapRoles } from '../engine/palette';
import { ARCHETYPES } from '../engine/archetypes';
import { generateDirectionsSync, scoreArchetype, systemFromDirection } from '../engine/directions';
import { personalityFromTraits } from '../engine/personality';
import { canEnter, contextComplete, furthestReachable } from '../model/steps';
import { EMPTY_CONTEXT } from '../model/flowStore';
import { coreWrites } from '../persist/commitBrand';
import type { BrandContext, LogoMetrics, LogoRead } from '../model/types';

/* ── Fixtures ──────────────────────────────────────────────────────── */

/** An RGBA buffer: a black filled square on an opaque white ground. */
function squareOnWhite(size = 64, inset = 16) {
  const data = new Uint8ClampedArray(size * size * 4).fill(255);
  for (let y = inset; y < size - inset; y++) {
    for (let x = inset; x < size - inset; x++) {
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 0;
    }
  }
  return data;
}

/** A black right-triangle on transparency — asymmetric, diagonal edge. */
function triangleOnClear(size = 64) {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x <= y; x++) data[(y * size + x) * 4 + 3] = 255;
  }
  return data;
}

const METRICS: LogoMetrics = {
  ratio: 1,
  coverage: 0.4,
  symmetry: 0.9,
  straightness: 0.7,
  detail: 0.1,
  inkSaturation: 0,
  inkHue: null,
  hadTransparency: true,
};

function read(over: Partial<LogoMetrics> = {}, composition: 'symbol' | 'wordmark' | 'combination' = 'symbol'): LogoRead {
  const metrics = { ...METRICS, ...over };
  const traits = traitsFromMetrics(metrics, composition);
  return { metrics, traits, findings: findingsFor(traits, metrics) };
}

const CTX: BrandContext = {
  ...EMPTY_CONTEXT,
  name: 'Northwind',
  oneLiner: 'Accounting software for small studios.',
  industry: 'saas',
  audience: 'small-business',
  positioning: 'challenger',
  personality: ['bold', 'confident'],
};

/* ── The logo read ─────────────────────────────────────────────────── */

describe('isolating the ink', () => {
  it('lifts a mark off an opaque ground — ink where the mark is, nothing where the ground is', () => {
    const ink = isolateInk(squareOnWhite(), 64, 64);
    expect(ink.hadTransparency).toBe(false);
    expect(ink.alpha[32 * 64 + 32]).toBe(255);
    expect(ink.alpha[2 * 64 + 2]).toBe(0);
  });

  it('uses the real alpha channel when there is one', () => {
    const ink = isolateInk(triangleOnClear(), 64, 64);
    expect(ink.hadTransparency).toBe(true);
    expect(ink.alpha[63 * 64 + 1]).toBe(255);
    expect(ink.alpha[1 * 64 + 60]).toBe(0);
  });

  it('reports a black mark as uncoloured', () => {
    const ink = isolateInk(squareOnWhite(), 64, 64);
    expect(ink.inkSaturation).toBe(0);
    expect(ink.inkHue).toBeNull();
  });
});

describe('measuring the ink', () => {
  it('a square is symmetric, axis-aligned and solid', () => {
    const m = measureInk(isolateInk(squareOnWhite(), 64, 64))!;
    expect(m.ratio).toBeCloseTo(1, 1);
    expect(m.symmetry).toBeGreaterThan(0.95);
    expect(m.straightness).toBeGreaterThan(0.8);
    expect(m.coverage).toBeGreaterThan(0.95);
  });

  it('a right triangle is not mirror-symmetric and has a diagonal edge', () => {
    const m = measureInk(isolateInk(triangleOnClear(), 64, 64))!;
    expect(m.symmetry).toBeLessThan(0.7);
    expect(m.straightness).toBeLessThan(0.9);
  });

  it('answers null for a blank file rather than inventing numbers', () => {
    const blank = new Uint8ClampedArray(16 * 16 * 4);
    expect(measureInk(isolateInk(blank, 16, 16))).toBeNull();
  });
});

describe('reading the metrics as a designer would', () => {
  it('names geometry, weight and proportion from the numbers', () => {
    expect(traitsFromMetrics({ ...METRICS, straightness: 0.8 }, 'symbol').geometry).toBe('geometric');
    expect(traitsFromMetrics({ ...METRICS, straightness: 0.2 }, 'symbol').geometry).toBe('organic');
    expect(traitsFromMetrics({ ...METRICS, coverage: 0.7 }, 'symbol').weight).toBe('heavy');
    expect(traitsFromMetrics({ ...METRICS, coverage: 0.15 }, 'symbol').weight).toBe('light');
    expect(traitsFromMetrics({ ...METRICS, ratio: 3 }, 'wordmark').proportion).toBe('wide');
  });

  it('a wide, detailed mark gets a larger minimum size and more clear space', () => {
    const wide = traitsFromMetrics({ ...METRICS, ratio: 3, detail: 0.5 }, 'wordmark');
    const compact = traitsFromMetrics(METRICS, 'symbol');
    expect(minWidthFor(wide)).toBeGreaterThan(minWidthFor(compact));
    expect(clearSpaceFor(wide)).toBeGreaterThan(clearSpaceFor(compact));
  });

  it('every finding says what it will drive, not just what it saw', () => {
    for (const f of read({ coverage: 0.7, symmetry: 0.4, hadTransparency: false }).findings) {
      expect(f.title.length).toBeGreaterThan(5);
      expect(f.detail.length).toBeGreaterThan(30);
    }
  });

  it('a symbol-only mark is told it will get a lockup', () => {
    expect(read({}, 'symbol').findings.some((f) => /lockup/i.test(f.detail))).toBe(true);
  });

  it('suggests personality from the mark, at most three', () => {
    const s = personalityFromTraits(read({ coverage: 0.7 }).traits);
    expect(s).toContain('bold');
    expect(s.length).toBeLessThanOrEqual(3);
  });
});

describe('sizedSvg', () => {
  it('gives an unsized SVG the proportions of its viewBox', () => {
    const out = sizedSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><rect width="10" height="10"/></svg>');
    expect(out).toMatch(/width="1024"/);
    expect(out).toMatch(/height="512"/);
  });

  it('leaves an already-sized SVG alone', () => {
    const svg = '<svg width="40" height="20" viewBox="0 0 40 20"></svg>';
    expect(sizedSvg(svg)).toBe(svg);
  });
});

/* ── Palette ───────────────────────────────────────────────────────── */

describe('palette', () => {
  const spec = ARCHETYPES.find((a) => a.id === 'precision-tech')!.palette;

  it('the primary always reads on the light ground (large-type floor)', () => {
    for (const a of ARCHETYPES) {
      for (let variant = 0; variant < 3; variant++) {
        const p = buildPalette(a.palette, { anchorHue: null, avoid: [], seed: 0.5, variant });
        expect(contrastRatio(p.primary, p.light)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(p.dark, p.light)).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('never uses a family the owner ruled out', () => {
    const p = buildPalette(spec, { anchorHue: null, avoid: ['blue', 'teal', 'purple'], seed: 0.4, variant: 0 });
    for (const hex of [p.primary, p.secondary, p.accent]) {
      expect(['blue', 'teal', 'purple']).not.toContain(familyOf(hex));
    }
  });

  it('anchors on a hue the owner brought', () => {
    const p = buildPalette(spec, { anchorHue: 10, avoid: [], seed: 0.4, variant: 0 });
    expect(familyOf(p.primary)).toBe('red');
  });

  it('allowedHue walks away from banned families', () => {
    expect(['red', 'orange', 'pink']).not.toContain(
      familyOf(buildPalette({ ...spec, hues: [allowedHue(0, ['red', 'orange', 'pink'])] }, { anchorHue: null, avoid: [], seed: 0.5, variant: 0 }).primary),
    );
  });

  it('warmer moves the primary toward orange; cooler toward blue', () => {
    const p = buildPalette(spec, { anchorHue: null, avoid: [], seed: 0.5, variant: 0 });
    const warm = hexToHsl(nudgePalette(p, 'warmer').primary).h;
    const cool = hexToHsl(nudgePalette(p, 'cooler').primary).h;
    const dist = (h: number, t: number) => Math.min(Math.abs(h - t), 360 - Math.abs(h - t));
    expect(dist(warm, 30)).toBeLessThan(dist(hexToHsl(p.primary).h, 30));
    expect(dist(cool, 220)).toBeLessThanOrEqual(dist(hexToHsl(p.primary).h, 220));
  });

  it('swapping roles keeps the palette readable', () => {
    const p = buildPalette(spec, { anchorHue: null, avoid: [], seed: 0.5, variant: 0 });
    const swapped = swapRoles(p, 'primary', 'secondary');
    expect(contrastRatio(swapped.primary, swapped.light)).toBeGreaterThanOrEqual(3);
  });

  it('CMYK is labelled approximate and well-formed', () => {
    expect(cmykString('#000000')).toBe('0, 0, 0, 100');
    expect(cmykString('#ff0000')).toBe('0, 100, 100, 0');
  });
});

/* ── Directions ────────────────────────────────────────────────────── */

describe('directions', () => {
  it('returns three distinct directions, deterministically', () => {
    const a = generateDirectionsSync({ read: read(), context: CTX });
    const b = generateDirectionsSync({ read: read(), context: CTX });
    expect(a).toHaveLength(3);
    expect(new Set(a.map((d) => d.archetypeId)).size).toBe(3);
    expect(a.map((d) => d.palette.primary)).toEqual(b.map((d) => d.palette.primary));
  });

  it('ranks by fit: a bold SaaS challenger leads with the challenger direction', () => {
    const [first] = generateDirectionsSync({ read: read({ coverage: 0.7 }), context: CTX });
    expect(first.archetypeId).toBe('electric-challenger');
  });

  it('every rationale names a reason from the logo or the answers', () => {
    for (const d of generateDirectionsSync({ read: read(), context: CTX })) {
      expect(d.rationale.length).toBeGreaterThan(0);
      expect(d.rationale.join(' ')).toMatch(/saas|bold|confident|challenger|small businesses|geometric|mark|logo/i);
    }
  });

  it('a luxury fashion house gets a luxury direction', () => {
    const ctx = { ...CTX, industry: 'fashion', positioning: 'luxury', audience: 'luxury-buyers', personality: ['elegant', 'sophisticated'] };
    const ds = generateDirectionsSync({ read: read({ coverage: 0.2 }), context: ctx });
    expect(ds.map((d) => d.archetypeId)).toContain('luxe-noir');
  });

  it('"show me different ones" brings archetypes not yet seen', () => {
    const first = generateDirectionsSync({ read: read(), context: CTX });
    const next = generateDirectionsSync({ read: read(), context: CTX, round: 1, exclude: first.map((d) => d.archetypeId) });
    for (const d of next) expect(first.map((x) => x.archetypeId)).not.toContain(d.archetypeId);
  });

  it('fills the samples with the brand name and keeps the owner’s own line', () => {
    const [d] = generateDirectionsSync({ read: read(), context: CTX });
    expect(d.voice.samples.join(' ')).toContain('Northwind');
    expect(d.voice.samples).toContain(CTX.oneLiner);
    expect(d.voice.samples.join(' ')).not.toMatch(/\{(name|industry|audience)\}/);
  });

  it('scores higher for the archetype whose fit lists match', () => {
    const challenger = ARCHETYPES.find((a) => a.id === 'electric-challenger')!;
    const care = ARCHETYPES.find((a) => a.id === 'natural-care')!;
    expect(scoreArchetype(challenger, read(), CTX).score).toBeGreaterThan(scoreArchetype(care, read(), CTX).score);
  });

  it('a symbol becomes a lockup; a wordmark does not', () => {
    const [d] = generateDirectionsSync({ read: read(), context: CTX });
    expect(systemFromDirection(d, read({}, 'symbol')).logo.lockup).toBe(true);
    expect(systemFromDirection(d, read({}, 'wordmark')).logo.lockup).toBe(false);
  });
});

/* ── Steps & writes ────────────────────────────────────────────────── */

describe('steps', () => {
  const base = { logo: null, read: null, context: EMPTY_CONTEXT, directions: [], system: null, committed: null };

  it('a cold deep link is clamped to the first step', () => {
    expect(furthestReachable('system', base)).toBe('logo');
  });

  it('context needs the four required answers; colour feelings are optional', () => {
    expect(contextComplete(CTX)).toBe(true);
    expect(contextComplete({ ...CTX, personality: [] })).toBe(false);
  });

  it('read needs a logo and a name', () => {
    const logo = { name: 'x', originalUrl: '', inkUrl: '', width: 1, height: 1 };
    expect(canEnter('read', { ...base, logo })).toBe(false);
    expect(canEnter('read', { ...base, logo, context: { ...EMPTY_CONTEXT, name: 'A' } })).toBe(true);
  });
});

describe('commit', () => {
  it('writes only real Core paths', () => {
    const [d] = generateDirectionsSync({ read: read(), context: CTX });
    const writes = coreWrites(systemFromDirection(d, read()), CTX);
    for (const w of writes) expect(isCoreFieldPath(w.path)).toBe(true);
    expect(writes.map((w) => w.path)).toEqual(expect.arrayContaining(['colors.primary', 'typography.primary', 'voice.tone', 'rules.logo']));
  });
});
