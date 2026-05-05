// Phase 5.1a — generateResizeVariants tests.
import { describe, expect, it } from 'vitest';
import { generateResizeVariants, variantName } from './generateResizeVariants';
import type { BrandOSDocument } from '../schema';
import type { DimensionPreset } from '../content-types/types';

function squareSource(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: 'src-1',
    contentType: 'social-post',
    brandId: 'brand-raqm',
    masterPages: [],
    metadata: {},
    pages: [
      {
        id: 'p-1',
        name: 'Page 1',
        width: 1000,
        height: 1000,
        background: { fill: '#ffffff' },
        layers: [
          {
            id: 'l-text',
            kind: 'text',
            name: 'Headline',
            transform: { x: 100, y: 200, width: 800, height: 200, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1, visible: true, locked: false, brandLocked: false,
            text: 'Hello',
            fontFamily: 'Inter',
            fontSize: 48,
            color: '#000000',
            fontWeight: 'bold',
            textAlign: 'left',
            lineHeight: 1.2,
          },
          {
            id: 'l-shape',
            kind: 'shape',
            name: 'BG block',
            transform: { x: 0, y: 0, width: 1000, height: 1000, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1, visible: true, locked: false, brandLocked: false,
            shape: 'rectangle',
            fill: '#ff0000',
          },
        ],
      },
    ],
  } as BrandOSDocument;
}

const STORY: DimensionPreset = { label: 'Story 9:16', width: 1080, height: 1920 };
const PORTRAIT: DimensionPreset = { label: 'Portrait 4:5', width: 1080, height: 1350 };

describe('generateResizeVariants', () => {
  it('returns one variant per target preset', () => {
    const result = generateResizeVariants({
      source: squareSource(),
      targets: [STORY, PORTRAIT],
    });
    expect(result.variants).toHaveLength(2);
  });

  it('all variants + source share the same familyId', () => {
    const result = generateResizeVariants({
      source: squareSource(),
      targets: [STORY, PORTRAIT],
    });
    expect(result.familyId).toBeTruthy();
    expect(result.sourceWithFamily.familyId).toBe(result.familyId);
    for (const v of result.variants) {
      expect(v.familyId).toBe(result.familyId);
    }
  });

  it('variants point sourceDesignId at the source; source has no sourceDesignId', () => {
    const source = squareSource();
    const result = generateResizeVariants({ source, targets: [STORY] });
    expect(result.sourceWithFamily.sourceDesignId).toBeUndefined();
    expect(result.variants[0].sourceDesignId).toBe(source.id);
  });

  it('honors an externally-supplied familyId', () => {
    const presetId = '00000000-0000-0000-0000-000000000abc';
    const result = generateResizeVariants({
      source: squareSource(),
      targets: [STORY],
      familyId: presetId,
    });
    expect(result.familyId).toBe(presetId);
  });

  it('each variant gets a fresh id distinct from source and siblings', () => {
    const source = squareSource();
    const result = generateResizeVariants({
      source,
      targets: [STORY, PORTRAIT],
    });
    const ids = [source.id, ...result.variants.map((v) => v.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sets target dimensions on every page of each variant', () => {
    const result = generateResizeVariants({
      source: squareSource(),
      targets: [STORY],
    });
    expect(result.variants[0].pages[0].width).toBe(1080);
    expect(result.variants[0].pages[0].height).toBe(1920);
  });

  it('proportionally scales layer transforms (1000x1000 → 1080x1920)', () => {
    const result = generateResizeVariants({
      source: squareSource(),
      targets: [STORY],
    });
    const variant = result.variants[0];
    const text = variant.pages[0].layers.find((l) => l.id === 'l-text')!;
    // Source: { x: 100, y: 200, w: 800, h: 200 } in a 1000x1000 page.
    // Target: 1080x1920. scaleX=1.08, scaleY=1.92.
    expect(text.transform.x).toBeCloseTo(108, 5);    // 100 * 1.08
    expect(text.transform.y).toBeCloseTo(384, 5);    // 200 * 1.92
    expect(text.transform.width).toBeCloseTo(864, 5); // 800 * 1.08
    expect(text.transform.height).toBeCloseTo(384, 5); // 200 * 1.92
  });

  it('preserves layer ids across variants (stable identity for 5.3 propagation)', () => {
    const source = squareSource();
    const result = generateResizeVariants({
      source,
      targets: [STORY, PORTRAIT],
    });
    const sourceLayerIds = source.pages[0].layers.map((l) => l.id);
    for (const v of result.variants) {
      const variantLayerIds = v.pages[0].layers.map((l) => l.id);
      expect(variantLayerIds).toEqual(sourceLayerIds);
    }
  });

  it('preserves non-transform layer fields (text content, fonts, colors, etc.)', () => {
    const result = generateResizeVariants({
      source: squareSource(),
      targets: [STORY],
    });
    const text = result.variants[0].pages[0].layers.find((l) => l.id === 'l-text');
    // The text layer's content, font, and color are unchanged — only the
    // geometry transform got scaled.
    expect(text).toMatchObject({
      kind: 'text',
      text: 'Hello',
      fontFamily: 'Inter',
      fontSize: 48,
      color: '#000000',
    });
  });

  it('discards brandResolution preview annotation on variants', () => {
    const source = squareSource();
    source.brandResolution = {
      mode: 'preview',
      brandId: 'brand-raqm',
      timestamp: new Date().toISOString(),
      resolutions: [],
    } as never;
    const result = generateResizeVariants({ source, targets: [STORY] });
    expect(result.variants[0].brandResolution).toBeUndefined();
  });
});

describe('variantName', () => {
  it('joins source name and preset label with em-dash', () => {
    expect(variantName('Spring campaign', STORY)).toBe('Spring campaign — Story 9:16');
  });
});
