import { describe, expect, it, vi } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import { buildBrandReferences, renderPaletteSwatch, pickLogoUrlForReference } from './brandReferences';
import type { ImageModelCaps } from '@/features/image-generation';

const brand = {
  id: 'b', slug: 'b', name: 'B', primaryColor: '#123456', fonts: { primary: 'Inter' }, assets: [],
  logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
} as unknown as Brand;

const caps = {
  supportsReferenceImages: true, maxReferenceImages: 5,
  supportedAspectRatios: ['1:1'], supportedSizes: [1024], supportedQualities: [],
  supportsMultipleOutputs: true, maxOutputs: 4, nPerCall: 1,
  supportsCancellation: true, supportsSeed: false, supportsNegativePrompt: true,
  supportsImageToImage: true, textRendering: 'strong',
} satisfies ImageModelCaps;

describe('brandReferences', () => {
  it('finds the primary logo url', () => {
    expect(pickLogoUrlForReference(brand)).toMatch(/^data:image\/svg/);
    expect(pickLogoUrlForReference(null)).toBeUndefined();
  });

  it('builds nothing for a text-only model', async () => {
    const out = await buildBrandReferences({ brand, caps: { ...caps, supportsReferenceImages: false, maxReferenceImages: 0 }, plan: { logo: true, palette: true }, paletteHexes: ['#123456'] });
    expect(out.references).toEqual([]);
  });

  it("sends the user's own references BEFORE ours, so the cap drops our helpers first", async () => {
    const rasterize = vi.fn(async () => 'data:image/png;base64,LOGO');
    const swatch = vi.fn(() => 'data:image/png;base64,PAL');
    const out = await buildBrandReferences(
      {
        brand, caps,
        plan: { logo: true, palette: true, previousDataUrl: 'data:image/png;base64,PREV' },
        paletteHexes: ['#123456'],
        userReferences: [
          { path: 'ai-refs/u/style.png', use: 'style' },
          { path: 'ai-refs/u/bottle.png', use: 'subject' },
        ],
      },
      { rasterize, swatch },
    );
    // previous first (it IS the subject of a refine), then the user's material
    // subject-before-style, then ours.
    expect(out.roles).toEqual(['previous', 'product', 'style', 'logo', 'palette']);
    expect(out.references[1].path).toBe('ai-refs/u/bottle.png');
    expect(out.references[2].path).toBe('ai-refs/u/style.png');
    expect(rasterize).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/svg/), expect.objectContaining({ size: 1024 }));
  });

  it("drops OUR helpers to the cap, never the picture the user chose", async () => {
    const rasterize = vi.fn(async () => 'data:image/png;base64,LOGO');
    const swatch = vi.fn(() => 'data:image/png;base64,PAL');
    const out = await buildBrandReferences(
      {
        brand, caps: { ...caps, maxReferenceImages: 1 },
        plan: { logo: true, palette: true },
        paletteHexes: ['#123456'],
        userReferences: [{ path: 'ai-refs/u/bottle.png', use: 'subject' }],
      },
      { rasterize, swatch },
    );
    expect(out.roles).toEqual(['product']);
    expect(out.references[0].path).toBe('ai-refs/u/bottle.png');
  });

  it('keeps our own references when the user attached none', async () => {
    const rasterize = vi.fn(async () => 'data:image/png;base64,LOGO');
    const swatch = vi.fn(() => 'data:image/png;base64,PAL');
    const capped = await buildBrandReferences(
      { brand, caps: { ...caps, maxReferenceImages: 1 }, plan: { logo: true, palette: true }, paletteHexes: ['#123456'] },
      { rasterize, swatch },
    );
    expect(capped.roles).toEqual(['logo']);
  });

  it('skips the logo when the plan says no, and the palette when there are no hexes', async () => {
    const rasterize = vi.fn(async () => 'x');
    const out = await buildBrandReferences({ brand, caps, plan: { logo: false, palette: true }, paletteHexes: [] }, { rasterize });
    expect(rasterize).not.toHaveBeenCalled();
    expect(out.references).toEqual([]);
  });

  it('renderPaletteSwatch draws one block per hex with a readable label', () => {
    const ctx = { fillStyle: '', font: '', textAlign: '', textBaseline: '', fillRect: vi.fn(), fillText: vi.fn() };
    const canvas = { width: 0, height: 0, getContext: () => ctx, toDataURL: () => 'data:image/png;base64,S' } as unknown as HTMLCanvasElement;
    const out = renderPaletteSwatch(['#000000', '#FFFFFF', 'nope'], { createCanvas: () => canvas, width: 200, height: 100 });
    expect(out).toBe('data:image/png;base64,S');
    // 1 background + 2 blocks
    expect(ctx.fillRect).toHaveBeenCalledTimes(3);
    expect(ctx.fillText).toHaveBeenCalledWith('#000000', 50, 88);
    expect(renderPaletteSwatch([])).toBeNull();
  });
});
