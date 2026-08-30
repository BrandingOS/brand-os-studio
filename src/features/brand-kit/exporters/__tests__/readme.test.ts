/**
 * The README, checked against the manifest it was generated from.
 *
 * Two failures this test exists to prevent, and they pull against each
 * other:
 *
 *  • The one `fontExport` shipped once: a README that describes a folder
 *    DIFFERENT from the folder beside it. So everything asserted here has
 *    to be DERIVED — a folder named because the manifest holds files in it,
 *    a deliverable named because a row said so.
 *  • QA Q28: 27 KB of per-file manifest, 249 rows repeating the same four
 *    sentences. A listing is not a readme, and the rule a kit is judged on
 *    was below all of it. So the summary is per FOLDER, and the test says
 *    plainly that a row-per-file is not what this document is.
 *
 * The rest is the four things the document has to say: the download
 * vocabulary in the same words the menu uses, what each format is for, the
 * clear-space formula, and an honest account of anything that was left out.
 */
import { describe, it, expect } from 'vitest';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { buildKitReadme, buildKitReadmeFile, type KitManifestEntry } from '../readme';
import { textOf } from './blobText';

const FILES: KitManifestEntry[] = [
  { path: 'logos/', label: 'Logos', kind: 'logos' },
  { path: 'colors/', label: 'Colors', kind: 'colors' },
  { path: 'fonts/', label: 'Fonts', kind: 'fonts' },
  { path: 'brand.json', label: 'Brand data' },
  { path: 'strategy.pdf', label: 'Brand strategy' },
  { path: 'deliverables/business-card.png', label: 'Business Card', kind: 'card' },
  { path: 'deliverables/letterhead.png', label: 'Letterhead', kind: 'card' },
  { path: 'deliverables/pitch-deck.pptx', label: 'Pitch Deck', kind: 'card' },
  { path: 'web/favicon.ico', label: 'Favicon' },
  { path: 'web/site.webmanifest', label: 'Web app manifest' },
  { path: 'email/signature.html', label: 'Email Signature' },
  { path: 'social/instagram-story-1080x1920.png', label: 'Story' },
];

/** Every path the document quotes in backticks. */
function quotedPaths(markdown: string): string[] {
  return [...markdown.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

describe('buildKitReadme — what is in this folder', () => {
  const markdown = buildKitReadme(mockBrand, FILES);

  it('describes every FOLDER the manifest has files in, with a count', () => {
    // Four folders across the fixture; each is named once, and the count is
    // the number of files really in it.
    expect(markdown).toMatch(/\| `logos\/` \| .+ \| 1 \|/);
    expect(markdown).toMatch(/\| `deliverables\/` \| .+ \| 3 \|/);
    expect(markdown).toMatch(/\| `web\/` \| .+ \| 2 \|/);
    expect(markdown).toMatch(/\| `social\/` \| .+ \| 1 \|/);
  });

  it('names a folder the manifest has nothing in — never', () => {
    const md = buildKitReadme(mockBrand, [{ path: 'logos/mark.svg', label: 'Logos' }]);
    expect(md).toContain('`logos/`');
    expect(md).not.toContain('`deliverables/`');
    expect(md).not.toContain('`fonts/`');
  });

  it('is a summary, not a listing — one row per folder, not per file', () => {
    // The defect: 249 rows and the same four sentences over and over.
    const many = Array.from({ length: 60 }, (_, i) => ({
      path: `logos/variant-${i}.svg`,
      label: 'Logos',
    }));
    const md = buildKitReadme(mockBrand, many);
    expect(md).toContain('| 60 |');
    expect(md).not.toContain('variant-42.svg');
    // And the whole document stays small enough that the rules below it
    // are still reachable.
    expect(md.length).toBeLessThan(8000);
  });

  it('names the loose files at the top level individually — they are few and each differs', () => {
    expect(markdown).toContain('- `brand.json` — Brand data.');
    expect(markdown).toMatch(/- `strategy\.pdf` — Brand strategy\..*print/i);
  });

  it('lists each deliverable once, with the formats it shipped in', () => {
    expect(markdown).toContain('| Business Card | PNG |');
    expect(markdown).toContain('| Pitch Deck | PPTX |');
    // One deliverable in two formats is ONE row naming both.
    const md = buildKitReadme(mockBrand, [
      { path: 'deliverables/business-card.png', label: 'Business Card' },
      { path: 'deliverables/business-card.pdf', label: 'Business Card' },
    ]);
    expect(md).toContain('| Business Card | PNG · PDF |');
    expect(md).toContain('### The 1 deliverables');
  });

  it('appends a note when the manifest carries one, for a root file', () => {
    const md = buildKitReadme(mockBrand, [
      { path: 'poster.png', label: 'Poster', note: 'Exported at 300 dpi.' },
    ]);
    expect(md).toContain('Exported at 300 dpi.');
  });

  it('counts a path once however many times it is claimed', () => {
    const md = buildKitReadme(mockBrand, [
      { path: 'brand.json', label: 'Brand data' },
      { path: 'brand.json', label: 'Brand data again' },
    ]);
    expect(quotedPaths(md).filter((p) => p === 'brand.json')).toHaveLength(1);
  });

  it('escapes a pipe rather than breaking the table', () => {
    const md = buildKitReadme(mockBrand, [
      { path: 'deliverables/a|b.png', label: 'Odd | name' },
    ]);
    expect(md).toContain('Odd \\| name');
  });

  it('says so plainly when nothing was exported', () => {
    const md = buildKitReadme(mockBrand, []);
    expect(md).toContain('Nothing');
    expect(md).not.toContain('| Folder |');
  });
});

describe('buildKitReadme — what it explains', () => {
  const markdown = buildKitReadme(mockBrand, FILES);

  it('teaches the download vocabulary in the menu’s own words', () => {
    for (const phrase of ['For web', 'For print', 'Vector', 'Flattened', 'Custom size…']) {
      expect(markdown, `the README never says "${phrase}"`).toContain(phrase);
    }
  });

  it('says what each format is for, not merely that it exists', () => {
    for (const format of ['PNG', 'JPG', 'SVG', 'PDF', 'PPTX', 'ICO', 'HTML']) {
      expect(markdown, `no guidance for ${format}`).toContain(`| ${format} `);
    }
    expect(markdown).toMatch(/PDF.*print/);
    expect(markdown).toMatch(/SVG.*scale/);
  });

  it('states the clear-space rule as a formula and as an example', () => {
    expect(markdown).toContain('Clear space');
    // R = one third of the smaller dimension — the same rule the logo
    // bundle's own README carries, in the same words.
    expect(markdown).toMatch(/one\s*\n?third of the logo’s smaller\s*\n?dimension/);
    expect(markdown).toContain('90 px');
    expect(markdown).toContain('30 px');
    expect(markdown).toContain('Minimum size');
    expect(markdown).toContain('24 px');
  });

  it('names the brand and its colours and typefaces', () => {
    expect(markdown.startsWith('# Nuworld — Brand Kit')).toBe(true);
    expect(markdown).toContain('#2550e3');
    expect(markdown).toContain('Instrument Serif');
    expect(markdown).toContain('Inter');
  });

  it('accounts for what was left out', () => {
    const md = buildKitReadme(mockBrand, {
      files: FILES,
      skipped: [{ label: 'Photos', reason: 'this brand has no photos yet' }],
      generatedAt: new Date('2026-08-29T10:00:00Z'),
      title: 'Nuworld — Print Pack',
    });
    expect(md.startsWith('# Nuworld — Print Pack')).toBe(true);
    expect(md).toContain('Exported 2026-08-29.');
    expect(md).toContain('Not in this export');
    expect(md).toContain('**Photos** — this brand has no photos yet.');
  });

  it('omits the skipped section entirely when nothing was skipped', () => {
    expect(markdown).not.toContain('Not in this export');
    expect(markdown).not.toContain('Exported undefined');
  });

  it('survives a brand it knows nothing about', () => {
    const md = buildKitReadme(null, FILES);
    expect(md.startsWith('# This brand — Brand Kit')).toBe(true);
    expect(md).toContain('`deliverables/`');
  });
});

describe('buildKitReadmeFile', () => {
  it('is README.md, as markdown, holding exactly the document', async () => {
    const file = buildKitReadmeFile(mockBrand, FILES);
    expect(file.path).toBe('README.md');
    expect(file.blob.type).toContain('markdown');
    expect(await textOf(file.blob)).toBe(buildKitReadme(mockBrand, FILES));
    expect(buildKitReadmeFile(mockBrand, FILES, 'docs/README.md').path).toBe('docs/README.md');
  });
});
