/**
 * The deck, read back as a PowerPoint file.
 *
 * "The export finished" is not the claim worth checking. A PPTX is a zip
 * of XML parts, so this test unzips the bytes the exporter produced,
 * counts `ppt/slides/slideN.xml`, and reads the text runs out of each one.
 * Every string a customer would see on a slide has to be findable in the
 * part for THAT slide — a deck whose fourth slide holds the third slide's
 * heading is a bug no smoke test would catch.
 *
 * The body is asserted where it actually goes: speaker notes, in
 * `ppt/notesSlides/`. That is the one field a picture of a slide can
 * never carry, and it is the reason this exporter exists.
 */
import { describe, it, expect } from 'vitest';
import type JSZipType from 'jszip';
import type { DeckContent, DeckSlide } from '@/features/brandkit/content';
import { defaultContentFor, defaultDeckContent } from '@/features/brandkit/content';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { buildDeckPptx } from '../deckPptx';
import { bytesOf } from '../bytes';

const slide = (kind: DeckSlide['kind'], parts: Partial<DeckSlide>): DeckSlide => ({
  id: `s-${kind}-${parts.heading ?? ''}`,
  kind,
  heading: '',
  body: '',
  bullets: [],
  stat: { value: '', label: '' },
  quote: { text: '', by: '' },
  ...parts,
});

/** One of every kind, so no layout goes unexercised. */
const CONTENT: DeckContent = {
  title: 'Nuworld Deck Title',
  subtitle: 'Nuworld Deck Subtitle',
  presenter: 'Dana Okonkwo',
  date: 'March 2026',
  slides: [
    slide('title', { heading: 'Zeta Opening Heading', body: 'Zeta opening notes.' }),
    slide('section', { heading: 'Zeta Section Heading' }),
    slide('content', {
      heading: 'Zeta Content Heading',
      body: 'Zeta content paragraph.',
      bullets: ['Zeta bullet one', 'Zeta bullet two', '   ', ''],
    }),
    slide('stat', {
      heading: 'Zeta Stat Heading',
      stat: { value: '94 percent', label: 'Zeta stat label' },
    }),
    slide('quote', {
      heading: 'Zeta Quote Heading',
      quote: { text: 'Zeta quoted sentence', by: 'Zeta attribution' },
    }),
    slide('closing', { heading: 'Zeta Closing Heading', body: 'Zeta closing line.' }),
  ],
};

/** A 1×1 PNG, so the title and closing slides have a real image to embed. */
const LOGO =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function openPptx(content: DeckContent, logo?: string) {
  const files = await buildDeckPptx(content, mockBrand, logo ? { logo } : {});
  expect(files).toHaveLength(1);
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await bytesOf(files[0].blob));
  return { files, zip };
}

/** The visible text of one slide part, with the XML taken off. */
async function slideText(zip: JSZipType, index: number): Promise<string> {
  const part = zip.file(`ppt/slides/slide${index}.xml`);
  expect(part, `no ppt/slides/slide${index}.xml`).not.toBeNull();
  const xml = await part!.async('string');
  // XML entities are decoded, so an assertion may be written in the words a
  // reader would see: a heading holding an apostrophe travels as `&apos;`.
  return [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
    .map((m) =>
      m[1]
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&'),
    )
    .join('\n');
}

describe('buildDeckPptx — the container', () => {
  it('is one .pptx, and it is a zip holding one part per slide', async () => {
    const { files, zip } = await openPptx(CONTENT, LOGO);
    expect(files[0].path).toBe('presentation.pptx');
    expect(files[0].blob.type).toContain('presentationml.presentation');

    const parts = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
    expect(parts).toHaveLength(CONTENT.slides.length);
    for (let i = 1; i <= CONTENT.slides.length; i += 1) {
      expect(zip.file(`ppt/slides/slide${i}.xml`), `slide${i}.xml missing`).not.toBeNull();
    }
    // A pptx is only a pptx if these are in it.
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    expect(zip.file('ppt/presentation.xml')).not.toBeNull();
  });

  it('names the file the caller asked for', async () => {
    const files = await buildDeckPptx(CONTENT, mockBrand, { fileName: 'pitch-deck.pptx' });
    expect(files[0].path).toBe('pitch-deck.pptx');
  });
});

describe('buildDeckPptx — what is on each slide', () => {
  it("every slide's heading is in its OWN part", async () => {
    const { zip } = await openPptx(CONTENT, LOGO);
    for (let i = 0; i < CONTENT.slides.length; i += 1) {
      const heading = CONTENT.slides[i].heading;
      const text = await slideText(zip, i + 1);
      expect(text, `slide ${i + 1} is missing its heading`).toContain(heading);
      // …and nobody else's.
      for (let j = 0; j < CONTENT.slides.length; j += 1) {
        if (j === i) continue;
        expect(text, `slide ${i + 1} carries slide ${j + 1}'s heading`).not.toContain(
          CONTENT.slides[j].heading,
        );
      }
    }
  });

  it('carries the stat, the quote, the bullets and the title-slide meta', async () => {
    const { zip } = await openPptx(CONTENT, LOGO);
    const title = await slideText(zip, 1);
    expect(title).toContain('Nuworld Deck Subtitle');
    expect(title).toContain('Dana Okonkwo');
    expect(title).toContain('March 2026');

    const content = await slideText(zip, 3);
    expect(content).toContain('Zeta content paragraph.');
    expect(content).toContain('Zeta bullet one');
    expect(content).toContain('Zeta bullet two');

    const stat = await slideText(zip, 4);
    expect(stat).toContain('94 percent');
    expect(stat).toContain('Zeta stat label');

    const quote = await slideText(zip, 5);
    expect(quote).toContain('Zeta quoted sentence');
    expect(quote).toContain('Zeta attribution');
  });

  it('puts the body in the speaker notes, not only on the slide', async () => {
    const { zip } = await openPptx(CONTENT, LOGO);
    const notes = Object.keys(zip.files).filter((p) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(p));
    expect(notes.length).toBeGreaterThan(0);
    const all = (
      await Promise.all(notes.map((p) => zip.file(p)!.async('string')))
    ).join('\n');
    expect(all).toContain('Zeta opening notes.');
    expect(all).toContain('Zeta closing line.');
  });

  it('embeds the logo when one is handed in, and nothing when one is not', async () => {
    // A zip carries the FOLDER whether or not anything is in it, so only
    // real entries count.
    const mediaFiles = (zip: JSZipType) =>
      Object.values(zip.files).filter((f) => !f.dir && f.name.startsWith('ppt/media/'));

    const withLogo = await openPptx(CONTENT, LOGO);
    expect(mediaFiles(withLogo.zip).length).toBeGreaterThan(0);

    const without = await openPptx(CONTENT);
    expect(mediaFiles(without.zip)).toHaveLength(0);
    // …and the slides still carry every word.
    expect(await slideText(without.zip, 1)).toContain('Zeta Opening Heading');
  });

  it('never prints a blank bullet', async () => {
    const { zip } = await openPptx(CONTENT);
    const xml = await zip.file('ppt/slides/slide3.xml')!.async('string');
    expect(xml).not.toMatch(/<a:t>\s*<\/a:t>/);
  });
});

describe('buildDeckPptx — the brand, not a theme', () => {
  it('paints the title slide on the brand colour and names the brand typeface', async () => {
    const { zip } = await openPptx(CONTENT, LOGO);
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string');
    // `#2550E3` is mockBrand's own primary; a pptx wants it bare and upper.
    expect(xml).toContain('2550E3');
    expect(xml).toContain('Instrument Serif');
    expect(xml).toContain('Inter');
  });

  it('survives a brand it knows nothing about', async () => {
    const files = await buildDeckPptx(CONTENT, null);
    expect(files[0].blob.size).toBeGreaterThan(0);
  });
});

describe('buildDeckPptx — the real default deck', () => {
  it('exports one part per default slide, each carrying its heading', async () => {
    const content = defaultDeckContent({ name: 'Nuworld' }, new Date('2026-03-01T00:00:00Z'));
    const { zip } = await openPptx(content);
    const parts = Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p));
    expect(parts).toHaveLength(content.slides.length);
    for (let i = 0; i < content.slides.length; i += 1) {
      expect(await slideText(zip, i + 1)).toContain(content.slides[i].heading);
    }
  });

  it('a deck with no slides is an empty deck, not a crash', async () => {
    const files = await buildDeckPptx({ ...CONTENT, slides: [] }, mockBrand);
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await bytesOf(files[0].blob));
    expect(Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))).toHaveLength(0);
  });
});

/**
 * QA Q10 — four decks shipped two files.
 *
 * `deliverables/pitch-deck.pptx` and `business-plan.pptx` came out
 * byte-identical, and so did `proposal.pptx` and `case-studies.pptx`: every
 * presentation family hydrated the SAME `deck` content, and a PPTX carries
 * no styling of its own to tell them apart afterwards. The pairing was an
 * accident of the timestamp pptxgenjs stamps at second granularity — the
 * defect is that all five families held one document.
 *
 * So the assertion is on the WORDS, not on the bytes: each family's file
 * must carry headings the others do not.
 */
describe('buildDeckPptx — five families, five documents', () => {
  const FAMILIES = ['pres-pitch', 'pres-plan', 'pres-proposal', 'pres-case', 'pres-portfolio'];

  /** Everything a reader would see across the whole deck. */
  async function deckText(templateType: string): Promise<string> {
    const content = defaultContentFor('deck', { name: 'Nuworld' }, templateType) as DeckContent;
    const { zip } = await openPptx(content);
    const parts = Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort();
    const texts: string[] = [];
    for (let i = 1; i <= parts.length; i += 1) texts.push(await slideText(zip, i));
    return texts.join('\n');
  }

  it('gives every family a deck no other family exports', async () => {
    const byFamily = new Map<string, string>();
    for (const family of FAMILIES) byFamily.set(family, await deckText(family));
    const seen = new Map<string, string>();
    for (const [family, text] of byFamily) {
      const twin = seen.get(text);
      expect(twin, `${family} exports the same deck as ${twin}`).toBeUndefined();
      seen.set(text, family);
    }
  });

  it('each family carries the headings its own outline names', async () => {
    const expected: Record<string, string[]> = {
      'pres-plan': ['Executive summary', 'Products and services', 'Operating principles'],
      'pres-proposal': ['The brief', 'Scope of work', 'How we work'],
      'pres-case': ['The client', 'What we made', 'What we held to'],
      'pres-portfolio': ['Selected work', 'Who we work with', 'Get in touch'],
      'pres-pitch': ['In one line', 'What we make', 'What we value'],
    };
    for (const [family, headings] of Object.entries(expected)) {
      const text = await deckText(family);
      for (const heading of headings) {
        expect(text, `${family} never says "${heading}"`).toContain(heading);
      }
    }
  });

  it('names the document on its own cover', async () => {
    expect(await deckText('pres-plan')).toContain('Business plan');
    expect(await deckText('pres-proposal')).toContain('Proposal');
    expect(await deckText('pres-case')).toContain('Case study');
  });
});
