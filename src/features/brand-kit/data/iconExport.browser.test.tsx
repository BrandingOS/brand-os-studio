/**
 * The Icons zip, built for real and read back.
 *
 * The plan is unit-tested next door; this is the half that needs a browser —
 * opentype parsing the webfont, a canvas rasterising the glyph, and the actual
 * bytes landing in the actual zip. It is the only place the two questions D42
 * asked can be answered honestly: is the payload the one we intended, and are
 * the rasters the size we said?
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import JSZip from 'jszip';
import '@/index.css';
import '@flaticon/flaticon-uicons/css/regular/rounded.css';
import { addIconsToZip, type IconExportEntry } from './iconExport';

const ICONS = ['fi-rr-coins', 'fi-rr-receipt', 'fi-rr-chart-line-up'];

afterEach(cleanup);

/** Mount the glyphs the way the drilldown does, and hand back export entries. */
function mountEntries(): IconExportEntry[] {
  const { container } = render(
    <>
      {ICONS.map((cls) => (
        <span key={cls} className="brand-asset-render--icon" style={{ color: '#7231ff' }}>
          <i className={`fi ${cls}`} style={{ fontSize: 48 }} aria-hidden />
        </span>
      ))}
    </>,
  );
  const hosts = Array.from(container.querySelectorAll<HTMLElement>('.brand-asset-render--icon'));
  return hosts.map((el, i) => ({
    name: ['Coins', 'Receipt', 'Chart Line Up'][i]!,
    source: ICONS[i]!,
    element: el,
  }));
}

async function build(options?: Parameters<typeof addIconsToZip>[3]) {
  await document.fonts.ready;
  const entries = mountEntries();
  const zip = new JSZip();
  const written = await addIconsToZip(zip, entries, 'raqm-icons', options);
  const paths = Object.keys(zip.files).filter((p) => !zip.files[p]!.dir);
  return { zip, written, paths };
}

/** The PNG header states its own dimensions — bytes 16..24 of the IHDR. */
async function pngSize(zip: JSZip, path: string): Promise<[number, number]> {
  const bytes = await zip.file(path)!.async('uint8array');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

describe('the Icons zip', () => {
  it('writes one entry per icon and nothing empty', async () => {
    const { zip, written, paths } = await build();
    expect(written).toBe(ICONS.length);
    for (const path of paths) {
      const bytes = await zip.file(path)!.async('uint8array');
      expect(bytes.byteLength, path).toBeGreaterThan(0);
    }
  });

  it('is LEAN by default — no JPG, no contact sheet, no PDF (D42)', async () => {
    const { paths } = await build();
    expect(paths.some((p) => p.startsWith('JPG/'))).toBe(false);
    expect(paths.some((p) => p.endsWith('.pdf'))).toBe(false);
    expect(paths).not.toContain('raqm-icons.svg');
  });

  it('ships the vector, both raster sizes, the sprite and the manifest', async () => {
    const { paths } = await build();
    expect(paths).toContain('SVG/coins.svg');
    expect(paths).toContain('PNG/64/coins.png');
    expect(paths).toContain('PNG/128/coins.png');
    expect(paths).toContain('sprite.svg');
    expect(paths).toContain('icons.json');
  });

  it('the rasters are the sizes the plan names, not 1024²', async () => {
    const { zip } = await build();
    expect(await pngSize(zip, 'PNG/64/coins.png')).toEqual([64, 64]);
    expect(await pngSize(zip, 'PNG/128/coins.png')).toEqual([128, 128]);
  });

  it('the SVG is real path data, not a raster in a wrapper', async () => {
    const { zip } = await build();
    const svg = await zip.file('SVG/coins.svg')!.async('string');
    expect(svg).toContain('<path d="');
    expect(svg).not.toContain('<image');
    // The tint the tile was drawn in, baked into the file.
    expect(svg.toLowerCase()).toContain('#7231ff');
  });

  it('the manifest describes what is in the zip, and every path resolves', async () => {
    const { zip, paths } = await build();
    const manifest = JSON.parse(await zip.file('icons.json')!.async('string'));
    expect(manifest.count).toBe(ICONS.length);
    expect(manifest.variant).toBe('lean');
    expect(manifest.tint).toBe('#7231ff');
    for (const icon of manifest.icons) {
      expect(paths, icon.svg).toContain(icon.svg);
      for (const p of Object.values(icon.png as Record<string, string>)) {
        expect(paths, p).toContain(p);
      }
    }
  });

  it('the sprite holds every icon as a symbol addressable by name', async () => {
    const { zip } = await build();
    const sprite = await zip.file('sprite.svg')!.async('string');
    expect(sprite).toContain('<symbol id="coins"');
    expect(sprite).toContain('<symbol id="chart-line-up"');
  });

  it('the full bundle is the one that carries the heavy formats', async () => {
    const { paths } = await build({ variant: 'full' });
    expect(paths.some((p) => p.startsWith('JPG/'))).toBe(true);
    expect(paths).toContain('raqm-icons.svg');
  });
});
