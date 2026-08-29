/**
 * What the Icons download contains, and what it stopped containing.
 *
 * The download was 13.6–14.2 MB (`.audit/OURS.md` D42) and the two biggest
 * things in it were an 8.9 MB PDF of a contact sheet and a JPG of every icon —
 * a transparent line drawing flattened onto white, i.e. a worse copy of the
 * PNG beside it. The PNGs themselves were 1024², four times the largest size an
 * icon is ever placed at.
 *
 * The part of that fix which can be tested without a browser is the PLAN: what
 * files exist, what they are called, and what the manifest says about them.
 * `addIconsToZip` needs opentype, a loaded webfont, a canvas and a DOM, so the
 * bytes are exercised in the browser test; the decisions are exercised here,
 * where they are cheap and exhaustive.
 */
import { describe, expect, it } from 'vitest';
import {
  ICON_PNG_SIZES,
  buildIconSprite,
  buildIconsManifest,
  iconSlug,
  planIconFiles,
  type IconManifestEntry,
} from './iconExport';

const NOW = new Date('2026-08-30T00:00:00.000Z');

function plan(names: string[], lean = true): IconManifestEntry[] {
  const used = new Set<string>();
  return names.map((n) => planIconFiles(n, `fi-rr-${n.toLowerCase().replace(/\s+/g, '-')}`, used, lean));
}

describe('file names', () => {
  it('two icons with the same name do not become one file', () => {
    const used = new Set<string>();
    expect(iconSlug('Star', used)).toBe('star');
    expect(iconSlug('Star', used)).toBe('star-2');
    expect(iconSlug('Star', used)).toBe('star-3');
  });

  it('a name a filesystem cannot hold still produces one', () => {
    const used = new Set<string>();
    expect(iconSlug('Chart / Line Up!', used)).toBe('chart-line-up');
    expect(iconSlug('', used)).toBe('icon');
  });
});

describe('the lean bundle — what a download actually is', () => {
  const entries = plan(['Chart Line Up', 'Coins', 'Receipt']);

  it('ships the vector and the two sizes an icon is placed at', () => {
    expect(ICON_PNG_SIZES).toEqual([64, 128]);
    for (const e of entries) {
      expect(e.svg).toBe(`SVG/${e.slug}.svg`);
      expect(e.png['64']).toBe(`PNG/64/${e.slug}.png`);
      expect(e.png['128']).toBe(`PNG/128/${e.slug}.png`);
    }
  });

  it('ships no JPG — a flattened copy of the PNG beside it (D42)', () => {
    for (const e of entries) expect(e.jpg).toBeUndefined();
  });

  it('the full bundle is the explicit ask, and only then is there a JPG', () => {
    for (const e of plan(['Coins'], false)) expect(e.jpg).toBe('JPG/coins.jpg');
  });
});

describe('the manifest', () => {
  const entries = plan(['Chart Line Up', 'Coins']);
  const manifest = buildIconsManifest(entries, {
    brand: 'raqm-icons',
    weight: 'br',
    tint: '#7231ff',
    lean: true,
    now: NOW,
  });

  it('answers the three questions a folder of SVGs cannot', () => {
    expect(manifest.weight).toBe('br');
    expect(manifest.weightLabel).toBe('Bold');
    expect(manifest.tint).toBe('#7231ff');
  });

  it('names every file it claims to contain, and counts them', () => {
    expect(manifest.count).toBe(2);
    expect(manifest.icons).toHaveLength(2);
    expect(manifest.icons[0]!.name).toBe('Chart Line Up');
    expect(manifest.icons[0]!.source).toBe('fi-rr-chart-line-up');
    expect(manifest.variant).toBe('lean');
    expect(manifest.brand).toBe('raqm-icons');
    expect(manifest.generated).toBe(NOW.toISOString());
  });

  it('is JSON a build step can read, with no undefined holes', () => {
    const round = JSON.parse(JSON.stringify(manifest));
    expect(round).toEqual(manifest);
    expect(JSON.stringify(manifest)).not.toContain('undefined');
  });

  it('an unknown weight still reads as a word, never as a code', () => {
    const m = buildIconsManifest([], { brand: 'x', weight: 'zz', tint: '#000000', lean: false });
    expect(m.weightLabel).toBe('Regular');
    expect(m.variant).toBe('full');
  });
});

describe('the sprite', () => {
  const sprite = buildIconSprite([
    { slug: 'coins', name: 'Coins', path: 'M0 0h10v10H0z' },
    { slug: 'receipt', name: 'Receipt', path: 'M1 1h8v8H1z' },
  ]);

  it('is one document with one symbol per icon, addressable by name', () => {
    expect(sprite.startsWith('<svg')).toBe(true);
    expect(sprite).toContain('<symbol id="coins"');
    expect(sprite).toContain('<symbol id="receipt"');
    expect(sprite).toContain('<title>Coins</title>');
    expect((sprite.match(/<symbol /g) ?? [])).toHaveLength(2);
  });

  it('carries no colour — the page that uses it decides', () => {
    // A sprite with the tint baked in can only ever be one colour, which is
    // the opposite of why anyone reaches for a sprite.
    expect(sprite).toContain('fill="currentColor"');
    expect(sprite).not.toContain('#');
  });

  it('escapes a name rather than emitting broken XML', () => {
    const s = buildIconSprite([{ slug: 'a', name: 'Ben & Jerry <3', path: 'M0 0' }]);
    expect(s).toContain('Ben &amp; Jerry &lt;3');
  });
});
