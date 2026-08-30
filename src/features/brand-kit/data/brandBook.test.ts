/**
 * The brand book — the document a brand kit exists to produce.
 *
 * A PDF is the one artefact a unit test cannot really judge: it can prove
 * the file exists and holds the right words, and it cannot tell you the
 * page looks like a brand book. So the pages were built for Raqm and SKAM
 * against the running app and read back one at a time (`.audit/w2/`), and
 * what THIS file pins is everything that reading found — the arithmetic
 * behind the page, the rules the layout must keep, and the failures a
 * document must own out loud rather than swallow.
 */
import { describe, it, expect } from 'vitest';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { getEntry } from '../catalog/catalog';
import {
  BRAND_BOOK_APPLICATIONS,
  buildBrandBook,
  buildBrandBookPdf,
  collectApplicationShots,
  hexToCmyk,
  proportionWeights,
} from './brandBook';
import { fitBox } from './strategyDocument';

/** jsdom's Blob has no `.text()`. */
const readBinary = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(blob);
  });

/**
 * Every word the document actually SETS, as one readable string.
 *
 * Searching the raw bytes for a sentence does not work and the reason is
 * the point of the test: the document wraps its own paragraphs, so a
 * phrase spanning a line break is two separate PDF strings and matches
 * nothing. Pulling the literals out and joining them is what makes
 * "is this said twice?" a question a test can ask.
 *
 * Non-ASCII is flattened to a space — jsPDF writes a typographic
 * apostrophe as a WinAnsi octal escape, and an assertion should not have
 * to know that.
 */
async function pdfText(blob: Blob): Promise<string> {
  const raw = await readBinary(blob);
  const out: string[] = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out.push(
      m[1]
        .replace(/\\([0-7]{3})/g, (_, o: string) => String.fromCharCode(parseInt(o, 8)))
        .replace(/\\([()\\])/g, '$1'),
    );
  }
  return out
    .join(' ')
    .replace(/[^\x20-\x7e]+/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * The document's words with everything but the letters taken out.
 *
 * Two things make a plain `toContain` useless here and both are jsPDF
 * doing its job: a paragraph is WRAPPED, so a sentence spanning a line
 * break is two strings; and a line holding a character outside the core
 * font's encoding is written one glyph at a time, so it comes back as
 * "T h i s b r a n d". Comparing letters answers the question the test is
 * actually asking — is this said, and how many times.
 */
const squash = (text: string) => text.replace(/[^a-z0-9]+/gi, '').toLowerCase();

/**
 * A brand with something in every section.
 *
 * `fonts: []` on purpose — `embedBrandFonts` would otherwise reach the
 * network for a typeface, and none of what is asserted here is about the
 * typeface. `applications: []` for the same reason: the gallery renders
 * the whole template library through a browser canvas.
 */
function answered(over: Partial<MockBrand> = {}): MockBrand {
  return {
    ...mockBrand,
    name: 'Raqm',
    fonts: [],
    colors: {
      ...mockBrand.colors,
      core: [
        { hex: '#7231FF', name: 'Iris' },
        { hex: '#00D4AA', name: 'Turquoise' },
      ],
      accent: [{ hex: '#F59E0B', name: 'Orange' }],
    },
    strategy: {
      ...mockBrand.strategy,
      summary: 'Raqm builds tools that make brand work repeatable.',
      mission: 'Make a brand something a small team can actually keep.',
      audience: 'founders',
      positioning: 'premium',
      personality: ['bold'],
      tone: 'authoritative',
      values: ['craft'],
      slogan: 'Make it last.',
    },
    about: [{ id: 'a1', title: 'Vision', content: 'Every team owns its own brand.' }],
    voice: { essay: 'We speak plainly.', pillars: ['Clear', 'Warm'] },
    ...over,
  };
}

describe('the numbers a print shop asks for', () => {
  it('converts hex to CMYK, and says black is black', () => {
    expect(hexToCmyk('#000000')).toEqual([0, 0, 0, 100]);
    expect(hexToCmyk('#FFFFFF')).toEqual([0, 0, 0, 0]);
    // Pure red: no cyan, all magenta, all yellow, no key.
    expect(hexToCmyk('#FF0000')).toEqual([0, 100, 100, 0]);
    // A real brand colour, measured against the page that prints it.
    expect(hexToCmyk('#7231FF')).toEqual([55, 81, 0, 0]);
  });

  it('proportions a palette so the bar is always full, whatever the count', () => {
    for (const n of [1, 2, 3, 6, 8]) {
      const w = proportionWeights(n);
      expect(w).toHaveLength(n);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
    // Steeply falling: one dominant colour, one support, the rest accents.
    // A palette drawn as equal squares says nothing about which colour the
    // brand IS.
    const six = proportionWeights(6);
    for (let i = 1; i < six.length; i += 1) expect(six[i]).toBeLessThan(six[i - 1]);
    expect(six[0]).toBeGreaterThan(0.4);
    expect(proportionWeights(0)).toEqual([]);
  });
});

describe('fitBox — a mark is placed, never stretched', () => {
  it('keeps the artwork’s own aspect inside any box', () => {
    // A wide wordmark in a square box: full width, letterboxed vertically.
    const wide = fitBox({ x: 0, y: 0, w: 100, h: 100 }, 5);
    expect(wide.w / wide.h).toBeCloseTo(5, 6);
    expect(wide.w).toBeCloseTo(100, 6);
    // A tall mark in a wide box: full height, centred horizontally.
    const tall = fitBox({ x: 0, y: 0, w: 200, h: 50 }, 0.5);
    expect(tall.w / tall.h).toBeCloseTo(0.5, 6);
    expect(tall.h).toBeCloseTo(50, 6);
    expect(tall.x).toBeCloseTo(87.5, 6);
  });

  it('never draws outside the box it was given', () => {
    for (const aspect of [0.2, 1, 2.5, 8]) {
      const at = fitBox({ x: 10, y: 20, w: 120, h: 60 }, aspect);
      expect(at.x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(at.y).toBeGreaterThanOrEqual(20 - 1e-9);
      expect(at.x + at.w).toBeLessThanOrEqual(130 + 1e-9);
      expect(at.y + at.h).toBeLessThanOrEqual(80 + 1e-9);
    }
  });

  it('treats a nonsense aspect as a square rather than dividing by zero', () => {
    const at = fitBox({ x: 0, y: 0, w: 60, h: 60 }, 0);
    expect(Number.isFinite(at.w)).toBe(true);
    expect(Number.isFinite(at.h)).toBe(true);
  });
});

describe('the applications the gallery shows', () => {
  it('names catalog KEYS that actually resolve', () => {
    // Keys, not labels: a key is storage identity and never changes, and
    // Email Signature still carries its historical `web::` key.
    for (const key of BRAND_BOOK_APPLICATIONS) {
      expect(getEntry(key), `no catalog entry for ${key}`).toBeTruthy();
    }
    expect(BRAND_BOOK_APPLICATIONS.length).toBeGreaterThanOrEqual(4);
  });

  it('says why there is no gallery rather than leaving one out silently', async () => {
    const { shots, skipped } = await collectApplicationShots(answered(), undefined);
    expect(shots).toEqual([]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toMatch(/saved brand/i);
  });
});

describe('the document', () => {
  it('builds every section, in reading order, with the page each starts on', async () => {
    const built = await buildBrandBook(answered(), undefined, { applications: [] });
    expect(built.blob.size).toBeGreaterThan(1000);
    expect(built.contents.map((c) => c.title)).toEqual([
      'The brand',
      'The logo',
      'Colour',
      'Typography',
      'Voice & tone',
      'Strategy',
      'Contact',
    ]);
    // Page numbers only ever go forwards, and the cover is not in them.
    const pages = built.contents.map((c) => c.page);
    expect(pages[0]).toBeGreaterThan(1);
    for (let i = 1; i < pages.length; i += 1) expect(pages[i]).toBeGreaterThan(pages[i - 1]);
  });

  it('leaves "In use" out entirely when there is nothing to show', async () => {
    // Not an empty page with a heading on it. A brand book that prints a
    // section title over nothing has told the reader something untrue.
    const built = await buildBrandBook(answered(), undefined, { applications: [] });
    expect(built.contents.some((c) => c.title === 'In use')).toBe(false);
  });

  it('adds "In use" when applications were rendered', async () => {
    const built = await buildBrandBook(answered(), undefined, {
      applications: [
        { label: 'Business Card', dataUrl: 'data:image/png;base64,AAAA', aspect: 1.6 },
      ],
    });
    expect(built.contents.map((c) => c.title)).toContain('In use');
    // A picture jsPDF cannot decode costs its own tile and nothing else.
    expect(built.contents.map((c) => c.title)).toContain('Contact');
  });

  it('says out loud that a brand with no artwork has no logo', async () => {
    const built = await buildBrandBook(answered(), undefined, { applications: [] });
    expect(built.skipped.map((s) => s.label)).toContain('Logo');
    expect(built.skipped.find((s) => s.label === 'Logo')?.reason).toMatch(/no logo/i);
  });

  it('writes the words as real text, not as a picture of text', async () => {
    // The whole reason this is a PDF rather than a PNG: it selects, it
    // searches, it survives being zoomed. Every string below is written
    // with a core font, so it is legible in the raw content stream.
    const raw = await pdfText(await buildBrandBookPdf(answered(), undefined, { applications: [] }));
    for (const phrase of [
      'Contents',
      'The logo',
      'CLEAR SPACE',
      'MINIMUM SIZE',
      'Colour',
      'PROPORTION',
      'CONTRAST',
      'Voice & tone',
      'Strategy',
    ]) {
      expect(squash(raw), `"${phrase}" is missing from the document`).toContain(squash(phrase));
    }
  });

  it('states the clear-space rule and the minimum size in the units they are used in', async () => {
    const raw = await pdfText(await buildBrandBookPdf(answered(), undefined, { applications: [] }));
    expect(squash(raw)).toContain(squash('one third of the mark’s height'));
    // A height, not a width: legibility is a function of how tall the mark
    // is, so one rule is right for a square symbol and a wordmark alike.
    expect(squash(raw)).toContain(squash('6 mm tall in print'));
    expect(squash(raw)).toContain(squash('24 px tall on screen'));
  });

  it('never says the same thing twice under two headings', async () => {
    // Measured on Raqm: the mission printed as the statement AND again four
    // pages later under MISSION, because the two sections each decided for
    // themselves what they were about.
    const noSummary = answered({
      strategy: { ...answered().strategy, summary: '' },
    });
    const raw = await pdfText(await buildBrandBookPdf(noSummary, undefined, { applications: [] }));
    const mission = squash('Make a brand something a small team can actually keep.');
    const hits = squash(raw).split(mission).length - 1;
    expect(hits).toBe(1);
  });

  it('prints an unanswered brand honestly instead of inventing one', async () => {
    const blank: MockBrand = {
      ...mockBrand,
      name: 'Untitled',
      fonts: [],
      colors: { ...mockBrand.colors, core: [], accent: [] },
      strategy: { ...mockBrand.strategy },
      about: [],
      voice: { essay: '', pillars: [] },
    };
    const built = await buildBrandBook(blank, undefined, { applications: [] });
    const raw = await pdfText(built.blob);
    expect(squash(raw)).toContain(squash('no colours yet'));
    expect(squash(raw)).toContain(squash('no typefaces yet'));
    expect(squash(raw)).toContain(squash('Not yet answered'));
    // Still a whole document: the sections exist, they just say so.
    expect(built.contents.map((c) => c.title)).toContain('Colour');
  });

  it('dates the export, so a book cannot be mistaken for the one it replaced', async () => {
    const raw = await pdfText(await buildBrandBookPdf(answered(), undefined, { applications: [] }));
    expect(raw).toMatch(/Exported \d{4}-\d{2}-\d{2}/);
  });
});
