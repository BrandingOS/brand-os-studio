/**
 * The README, checked against the manifest it was generated from.
 *
 * The failure this test exists to prevent is the one `fontExport` shipped
 * once already: a README that describes a folder DIFFERENT from the folder
 * beside it. So the central assertion is exhaustive rather than
 * representative — every path in the manifest must appear, and no path may
 * appear that was not in the manifest.
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
  return [...markdown.matchAll(/\| `([^`]+)` \|/g)].map((m) => m[1]);
}

describe('buildKitReadme — the file list', () => {
  const markdown = buildKitReadme(mockBrand, FILES);

  it('lists EVERY path it was given', () => {
    for (const file of FILES) {
      expect(markdown, `${file.path} is not in the README`).toContain(`\`${file.path}\``);
    }
  });

  it('lists nothing it was not given, in manifest order', () => {
    expect(quotedPaths(markdown)).toEqual(FILES.map((f) => f.path));
  });

  it('says what each row is, in the words the manifest used', () => {
    expect(markdown).toContain('| `deliverables/business-card.png` | Business Card.');
    expect(markdown).toContain('| `logos/` | Logos. A folder');
    // The description follows the EXTENSION, so a reader looking at a file
    // name is told what to do with that file.
    expect(markdown).toMatch(/`deliverables\/pitch-deck\.pptx`.*PowerPoint/);
    expect(markdown).toMatch(/`web\/favicon\.ico`.*favicon/i);
    expect(markdown).toMatch(/`strategy\.pdf`.*print/i);
  });

  it('appends a note when the manifest carries one', () => {
    const md = buildKitReadme(mockBrand, [
      { path: 'deliverables/poster.png', label: 'Poster', note: 'Exported at 300 dpi.' },
    ]);
    expect(md).toContain('Exported at 300 dpi.');
  });

  it('lists a path once however many times it is claimed', () => {
    const md = buildKitReadme(mockBrand, [
      { path: 'brand.json', label: 'Brand data' },
      { path: 'brand.json', label: 'Brand data again' },
    ]);
    expect(quotedPaths(md)).toEqual(['brand.json']);
  });

  it('escapes a pipe rather than breaking the table', () => {
    const md = buildKitReadme(mockBrand, [{ path: 'a|b.png', label: 'Odd | name' }]);
    expect(md).toContain('`a\\|b.png`');
    expect(md).toContain('Odd \\| name');
  });

  it('says so plainly when nothing was exported', () => {
    const md = buildKitReadme(mockBrand, []);
    expect(md).toContain('Nothing');
    expect(quotedPaths(md)).toEqual([]);
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
    expect(quotedPaths(md)).toEqual(FILES.map((f) => f.path));
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
