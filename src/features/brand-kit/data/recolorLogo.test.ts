import { describe, expect, it } from 'vitest';
import { logoCombosFor, recolorSourceIndexes, visuallyClose } from './recolorLogo';

describe('visuallyClose', () => {
  it('treats near-identical near-black shades as the same color', () => {
    expect(visuallyClose('#000000', '#080808')).toBe(true);
    expect(visuallyClose('#0A0A0F', '#181818')).toBe(true);
  });

  it('keeps obviously different shades distinct', () => {
    expect(visuallyClose('#000000', '#FFFFFF')).toBe(false);
    expect(visuallyClose('#000000', '#7231FF')).toBe(false);
    expect(visuallyClose('#FAFAFA', '#3A3A3A')).toBe(false);
  });
});

describe('logoCombosFor', () => {
  const oneLogo = [{ id: 'p', label: 'Primary', svg: '<svg/>' }];

  it('collapses a 32-step black→white ramp to a small set of distinct backgrounds', () => {
    // Mirrors the ramp `brandToMockBrand` produces for every brand.
    const ramp = Array.from({ length: 32 }, (_, i) => {
      const v = Math.round((i / 31) * 255);
      const h = v.toString(16).padStart(2, '0').toUpperCase();
      return { hex: `#${h}${h}${h}`, name: `Step${i}` };
    });
    const combos = logoCombosFor({
      logos: oneLogo,
      colors: {
        core: [{ hex: '#7231FF', name: 'Primary' }],
        accent: [],
        grey: ramp,
      },
    });
    // Mark colors used: Primary, White (Secondary skipped — only one core).
    // Dedup target: 32-step ramp + 1 brand color collapses to <= 8
    // representative backgrounds. Keep some headroom (the dedup is
    // perceptual, not a fixed fraction) but flag the regression if it
    // ever explodes back near 96.
    expect(combos.length).toBeLessThan(20);
  });

  it('pairs every brand ground the primary can read on, and none it cannot', () => {
    const combos = logoCombosFor({
      logos: oneLogo,
      colors: {
        core: [
          { hex: '#7231FF', name: 'Primary' },
          { hex: '#00D4AA', name: 'Secondary' },
        ],
        accent: [{ hex: '#F59E0B', name: 'Accent' }],
        grey: [
          { hex: '#FFFFFF', name: 'White' },
          { hex: '#000000', name: 'Black' },
        ],
      },
    });
    // Pairings are drawn only on the brand's own grounds; the rule tiles
    // (clear space, minimum size, misuse) sit on a stage the primary
    // silhouette reads on, which may be a universal light/dark ground.
    const pairings = combos.filter((c) => c.kind === 'pairing');
    for (const p of pairings) expect(p.contrast).toBeGreaterThanOrEqual(3);
    expect(combos.some((c) => c.kind === 'clear-space')).toBe(true);
    expect(combos.some((c) => c.kind === 'min-size')).toBe(true);
    expect(combos.filter((c) => c.kind === 'misuse')).toHaveLength(3);
  });

  it('returns empty when there are no logos', () => {
    const combos = logoCombosFor({
      logos: [],
      colors: { core: [{ hex: '#000', name: 'Primary' }], accent: [], grey: [] },
    });
    expect(combos).toEqual([]);
  });
});

describe('recolorSourceIndexes — one source per silhouette', () => {
  it('drops the mono cuts, which are the same drawing in one flat colour', () => {
    // Raqm, exactly: Primary plus its white and black cuts. The gallery
    // paints every combo as a MASK filled with the mark colour, so the
    // source's own colour is discarded and all three drew the same tile.
    expect(
      recolorSourceIndexes([
        { role: 'primary' },
        { role: 'mono.white' },
        { role: 'mono.black' },
      ]),
    ).toEqual([0]);
  });

  it('keeps roles that are genuinely different drawings', () => {
    expect(
      recolorSourceIndexes([
        { role: 'primary' },
        { role: 'iconmark' },
        { role: 'wordmark' },
        { role: 'mono.white' },
      ]),
    ).toEqual([0, 1, 2]);
  });

  it('still yields a source when a brand has ONLY mono cuts', () => {
    // Dropping every source would leave the drilldown empty, which is a
    // worse answer than one un-duplicated silhouette.
    expect(recolorSourceIndexes([{ role: 'mono.white' }, { role: 'mono.black' }])).toEqual([0]);
  });

  it('keeps a logo carrying no role at all', () => {
    // Legacy tiles predate `role`; nothing about them says "duplicate".
    expect(recolorSourceIndexes([{}, {}])).toEqual([0, 1]);
  });

  it('returns the INDEX into the original list, which the renderer looks up by', () => {
    expect(recolorSourceIndexes([{ role: 'mono.white' }, { role: 'iconmark' }])).toEqual([1]);
  });
});

describe('logoCombosFor — no duplicate tiles', () => {
  const colors = {
    core: [
      { hex: '#7231FF', name: 'Iris' },
      { hex: '#00D4AA', name: 'Turquoise' },
      { hex: '#0A0A0F', name: 'Black' },
    ],
    accent: [],
    grey: [],
  };

  it('never draws the same (kind, mark, background) twice', () => {
    const combos = logoCombosFor({
      logos: [
        { id: 'p', label: 'Primary', svg: '<svg/>', role: 'primary' },
        { id: 'd', label: 'On dark', svg: '<svg/>', role: 'mono.white' },
        { id: 'l', label: 'On light', svg: '<svg/>', role: 'mono.black' },
      ],
      colors,
    });
    // What the eye sees is (kind, mark, bg) — a mask discards everything else.
    const seen = combos.map((c) => `${c.kind}|${c.misuse ?? ''}|${c.mark.hex}|${c.bg.hex}`);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('offers one pairing per ground, chosen for contrast, never below the floor', () => {
    const combos = logoCombosFor({
      logos: [
        { id: 'p', label: 'Primary', svg: '<svg/>', role: 'primary' },
        { id: 'd', label: 'On dark', svg: '<svg/>', role: 'mono.white' },
      ],
      colors,
    });
    const pairings = combos.filter((c) => c.kind === 'pairing');
    const grounds = pairings.map((c) => c.bg.hex);
    expect(new Set(grounds).size).toBe(grounds.length);
    for (const p of pairings) expect(p.contrast).toBeGreaterThanOrEqual(3);
  });

  it('does not put a treatment where the pairing already used that ink', () => {
    const combos = logoCombosFor({
      logos: [{ id: 'p', label: 'Primary', svg: '<svg/>', role: 'primary' }],
      colors,
    });
    const byGround = new Map<string, string[]>();
    for (const c of combos.filter((x) => x.kind === 'pairing' || x.kind === 'treatment')) {
      byGround.set(c.bg.hex, [...(byGround.get(c.bg.hex) ?? []), c.mark.hex.toLowerCase()]);
    }
    for (const inks of byGround.values()) expect(new Set(inks).size).toBe(inks.length);
  });
});
