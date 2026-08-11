import { describe, expect, it } from 'vitest';
import {
  buildAiBlob,
  buildBaseColorSvg,
  buildShadeRows,
  buildShadesSvg,
} from './colorPaletteExport';
import {
  loadFeaturedVariants,
  saveFeaturedVariants,
} from './cardCustomizations';

describe('buildAiBlob — vector output (607MB-bundle regression)', () => {
  it('draws the base color SVG as vectors: small blob with a PDF header', async () => {
    const svg = buildBaseColorSvg({ hex: '#7231FF', name: 'Iris', role: 'Primary' });
    const blob = await buildAiBlob(svg, 1200, 750);
    expect(blob).toBeTruthy();
    // The raster path produced ~10.8 MB per file; vectors land in KB.
    expect(blob!.size).toBeLessThan(50 * 1024);
    // jsdom's Blob has no arrayBuffer() — read the header via FileReader.
    const head = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(new TextDecoder().decode((reader.result as ArrayBuffer).slice(0, 5)));
      reader.readAsArrayBuffer(blob!.slice(0, 5));
    });
    expect(head).toBe('%PDF-');
  });

  it('draws the shades stack as vectors too', async () => {
    const rows = buildShadeRows('#7231FF');
    const svg = buildShadesSvg(rows);
    const blob = await buildAiBlob(svg, 720, 80 * rows.length);
    expect(blob).toBeTruthy();
    expect(blob!.size).toBeLessThan(50 * 1024);
  });
});

describe('featured-variant persistence', () => {
  const KEY = 'brandos:brand-kit:featured-variants';

  it('round-trips per brand + label and isolates labels', () => {
    localStorage.removeItem(KEY);
    saveFeaturedVariants('test-brand', 'Business Card', ['a', 'b', 'c', 'd']);
    saveFeaturedVariants('test-brand', 'Letterhead', ['x']);
    expect(loadFeaturedVariants('test-brand')).toEqual({
      'Business Card': ['a', 'b', 'c', 'd'],
      Letterhead: ['x'],
    });
    expect(loadFeaturedVariants('other-brand')).toEqual({});
    expect(loadFeaturedVariants(undefined)).toEqual({});
    localStorage.removeItem(KEY);
  });
});
