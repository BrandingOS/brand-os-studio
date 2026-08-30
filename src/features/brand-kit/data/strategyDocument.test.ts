/**
 * The strategy documents — four files, four jobs.
 *
 * `.audit/OURS.md` D66: the kit shipped `about.md` holding the Vision and
 * the Voice beside `strategy.md` holding the eleven answers — two halves
 * of one document, filed under names that did not say which half you had.
 *
 * So this file does not check that the builders produce SOMETHING. It
 * checks the division of labour: that `about.md` is short and defers, that
 * `strategy.md` is complete, that each file names its siblings so a reader
 * who was not in the room can find the other three, and that the bundle's
 * README describes every file it actually contains and nothing else.
 */
import { describe, it, expect, vi } from 'vitest';
import JSZip from 'jszip';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { mockBrand } from '@/features/setup/data/mockBrand';
import {
  buildAboutMarkdown,
  buildStrategyBundle,
  buildStrategyJson,
  buildStrategyMarkdown,
  isVariableFont,
  rgb,
} from './strategyDocument';

/** jsdom's Blob has no `.text()`. */
const readText = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });

/** A brand with a real strategy, real notes and a real voice. */
function answered(over: Partial<MockBrand> = {}): MockBrand {
  return {
    ...mockBrand,
    name: 'Raqm',
    // No families: `embedBrandFonts` would otherwise reach the network for
    // a typeface, and what these documents SAY is not about the typeface.
    fonts: [],
    strategy: {
      ...mockBrand.strategy,
      summary: 'Raqm builds tools that make brand work repeatable.',
      industry: 'saas',
      products: 'A brand operating system: kit, guideline, editor.',
      audience: 'founders',
      positioning: 'premium',
      mission: 'Make a brand something a small team can actually keep.',
      personality: ['bold', 'precise'],
      tone: 'authoritative',
      style: ['minimal'],
      values: ['craft', 'clarity'],
      slogan: 'Make it last.',
    },
    websites: [{ id: 'w1', url: 'https://raqm.studio', live: true }],
    links: [{ id: 'l1', kind: 'instagram', url: 'https://instagram.com/raqm', label: 'Instagram' }],
    about: [{ id: 'a1', title: 'Vision', content: 'A world where every team owns its own brand.' }],
    voice: { essay: 'We speak plainly.', pillars: ['Clear', 'Warm'] },
    ...over,
  };
}

/** A brand that has answered nothing at all. */
function blank(): MockBrand {
  return {
    ...mockBrand,
    name: 'Untitled',
    fonts: [],
    strategy: { ...mockBrand.strategy },
    websites: [],
    links: [],
    about: [],
    voice: { essay: '', pillars: [] },
  };
}

describe('about.md — what this brand is, in a page', () => {
  it('opens with the brand name and a line saying what the file is', () => {
    const md = buildAboutMarkdown(answered());
    expect(md.startsWith('# Raqm')).toBe(true);
    expect(md).toContain('What this brand is, in a page');
  });

  it('names all three siblings, so the reader can find the rest', () => {
    const md = buildAboutMarkdown(answered());
    expect(md).toContain('strategy.md');
    expect(md).toContain('strategy.json');
    expect(md).toContain('brand-book.pdf');
    expect(md).toContain('## Where the rest is');
  });

  it('carries the slogan, the summary and the identity facts', () => {
    const md = buildAboutMarkdown(answered());
    expect(md).toContain('> Make it last.');
    expect(md).toContain('Raqm builds tools that make brand work repeatable.');
    expect(md).toContain('**Industry**');
    expect(md).toContain('**Website** — https://raqm.studio');
    expect(md).toContain('Instagram (https://instagram.com/raqm)');
  });

  it('DEFERS the notes and the voice rather than repeating half of them', () => {
    const md = buildAboutMarkdown(answered());
    expect(md).not.toContain('A world where every team owns its own brand.');
    expect(md).not.toContain('We speak plainly.');
  });

  it('says plainly when there is nothing to say', () => {
    const md = buildAboutMarkdown(blank());
    expect(md).toContain('has not described itself yet');
    expect(md).toContain('Setup → Brand Strategy');
  });

  it('promotes the mission when there is no summary, and never prints it twice', () => {
    const md = buildAboutMarkdown(
      answered({ strategy: { ...answered().strategy, summary: '' } }),
    );
    expect(md).toContain('Make a brand something a small team can actually keep.');
    expect(md).not.toContain('## Mission');
  });
});

describe('strategy.md — the whole record', () => {
  it('opens by saying what it is and naming about.md', () => {
    const md = buildStrategyMarkdown(answered());
    expect(md.startsWith('# Raqm — Brand strategy')).toBe(true);
    expect(md).toContain('`about.md` is the short version');
  });

  it('prints every answered card under Setup’s own name', () => {
    const md = buildStrategyMarkdown(answered());
    for (const name of [
      'Brand summary',
      'Industry',
      'Products / Services',
      'Audience',
      'Positioning',
      'Mission',
      'Personality',
      'Tone',
      'Visual style',
      'Core values',
      'Slogan',
    ]) {
      expect(md).toContain(`**${name}**`);
    }
  });

  it('carries the notes, the voice and its pillars — the half about.md defers', () => {
    const md = buildStrategyMarkdown(answered());
    expect(md).toContain('### Vision');
    expect(md).toContain('A world where every team owns its own brand.');
    expect(md).toContain('## Voice');
    expect(md).toContain('We speak plainly.');
    expect(md).toContain('- Clear');
  });

  it('says the strategy is unanswered rather than printing an empty page', () => {
    expect(buildStrategyMarkdown(blank())).toContain('Not yet answered');
  });
});

describe('strategy.json — the same record as data', () => {
  it('carries the stored id AND the label a person reads', () => {
    const doc = JSON.parse(buildStrategyJson(answered()));
    const tone = doc.strategy.find((a: { key: string }) => a.key === 'tone');
    expect(tone.value).toBe('authoritative');
    expect(tone.text).toBe('Authoritative');
    expect(tone.label).toBe('Tone');
  });

  it('describes itself, because a JSON file has no lede to open with', () => {
    const doc = JSON.parse(buildStrategyJson(answered()));
    expect(doc.document.what).toContain('Raqm');
    expect(Object.keys(doc.document.siblings).sort()).toEqual([
      'about.md',
      'brand-book.pdf',
      'strategy.md',
    ]);
  });

  it('lists every card, answered or not, so a consumer sees the whole shape', () => {
    const doc = JSON.parse(buildStrategyJson(blank()));
    expect(doc.strategy).toHaveLength(11);
    expect(doc.strategy.every((a: { text: string }) => a.text === '')).toBe(true);
  });
});

describe('the Strategy download', () => {
  it('bundles the book, the record and the data, and a README that names each', async () => {
    const { files, skipped } = await buildStrategyBundle(answered());
    const paths = files.map((f) => f.path).sort();
    expect(paths).toEqual(['README.md', 'brand-book.pdf', 'strategy.json', 'strategy.md']);
    // Nothing empty — a 0-byte file in a bundle is worse than a missing one.
    for (const file of files) expect(file.blob.size).toBeGreaterThan(0);

    const readme = await readText(files.find((f) => f.path === 'README.md')!.blob);
    for (const path of ['brand-book.pdf', 'strategy.md', 'strategy.json']) {
      expect(readme).toContain(`\`${path}\``);
    }
    expect(readme).toContain('The designed document');
    expect(readme).toContain('as data');
    // Without a saved brand the book cannot render the applications, and it
    // has to SAY so rather than quietly shipping a book with no gallery.
    expect(skipped.some((s) => /saved brand/.test(s.reason))).toBe(true);
    expect(readme).toContain('Not in this export');
  });

  it('falls back to the strategy PDF when the book cannot be built', async () => {
    vi.resetModules();
    vi.doMock('./brandBook', () => ({
      buildBrandBook: async () => {
        throw new Error('the applications could not be rendered');
      },
    }));
    const mod = await import('./strategyDocument');
    const { files, skipped } = await mod.buildStrategyBundle(answered());
    const paths = files.map((f) => f.path).sort();
    expect(paths).toContain('strategy.pdf');
    expect(paths).not.toContain('brand-book.pdf');
    expect(skipped.some((s) => s.label === 'Brand book')).toBe(true);
    vi.doUnmock('./brandBook');
    vi.resetModules();
  });

  it('reads back out of a zip as the files it claims', async () => {
    const { files } = await buildStrategyBundle(answered());
    const zip = new JSZip();
    for (const file of files) zip.file(file.path, file.blob);
    const round = await JSZip.loadAsync(await zip.generateAsync({ type: 'blob' }));
    expect(await round.file('strategy.md')!.async('string')).toContain('Brand strategy');
    const pdf = await round.file('brand-book.pdf')!.async('uint8array');
    expect(String.fromCharCode(...pdf.slice(0, 5))).toBe('%PDF-');
  });
});

describe('the two things a font can break', () => {
  it('refuses a variable font, which jsPDF renders as one stray glyph a line', () => {
    // Table directory: 12-byte header + one 16-byte record tagged `fvar`.
    const bytes = new Uint8Array(12 + 16);
    new DataView(bytes.buffer).setUint16(4, 1);
    bytes.set([0x66, 0x76, 0x61, 0x72], 12);
    expect(isVariableFont(bytes)).toBe(true);
  });

  it('treats an unreadable file as variable — a broken document is the worse risk', () => {
    expect(isVariableFont(new Uint8Array(4))).toBe(false);
    const lying = new Uint8Array(12);
    new DataView(lying.buffer).setUint16(4, 999);
    expect(isVariableFont(lying)).toBe(false);
  });

  it('reads hex the way jsPDF wants it', () => {
    expect(rgb('#7231FF')).toEqual([0x72, 0x31, 0xff]);
    expect(rgb('fff')).toEqual([255, 255, 255]);
  });
});
