/**
 * The README that travels with every download.
 *
 * A brand kit is handed to somebody who was not in the room — a developer
 * wiring up a favicon, a printer setting a business card, an agency laying
 * out a deck. What they get is a folder of files whose names are only
 * obvious to whoever exported them, and the two questions they always ask
 * are the two the zip never answered: *which of these do I use?* and *what
 * am I allowed to do to the logo?*
 *
 * So this file is not a table of contents with a friendly tone. It is the
 * four things the audit found missing from every previous export:
 *
 *   • **What the folders are**, and how much is in each. Summarised from
 *     the SAME manifest the zip was written from, so the README cannot
 *     describe a folder that is not there or miss one that is.
 *     `fontExport` learned that the hard way — a README naming four
 *     weights over a folder holding one is worse than none.
 *   • **The download vocabulary**, in the same words the menu uses: *For
 *     web* · *For print* · *Vector* · *Flattened* · *Custom size…*. The
 *     person reading this will come back for another size, and they should
 *     find the words they already saw.
 *   • **What each format is FOR.** "PDF" is not an instruction; "send this
 *     to a printer, it carries the real page size" is.
 *   • **The clear-space rule**, stated as the formula and as an example,
 *     because it is the one rule a kit is judged on and the one that gets
 *     dropped when the logo is pasted into a slide.
 *
 * ## It is a readme, not a listing
 *
 * It used to print one row per FILE. On a real kit that was 27 KB of
 * manifest — 249 rows repeating the same four sentences, "Vector artwork.
 * Scales to any size with no loss" over and over (QA Q28). A reader
 * scrolled past every logo weight to reach the clear-space rule, which is
 * the part they came for.
 *
 * A zip already lists its own files; what it cannot say is what the folders
 * MEAN. So the summary is one row per folder with a count, the root files
 * named individually because they are few and each is different, and one
 * line per deliverable naming the formats it shipped in. Everything is
 * still derived from the manifest, so nothing here can drift from the
 * archive it describes.
 *
 * Pure and total, like every builder here: content in, markdown out. No
 * DOM, no store, no download.
 */
import { brandColors, fontFamily, type BrandStyleSource } from '../renderers/brandStyle';
import { textBlob } from './bytes';
import type { ExportFile } from './types';

/**
 * One thing that was written into the bundle.
 *
 * Structurally a superset of nothing and a subset of `KitExportUnit` — a
 * unit from `planKitExport` (`{ entry, kind, label, path }`) satisfies it
 * as-is, which is the point: the integration wave passes the plan it
 * already has rather than building a second description of the same zip.
 */
export type KitManifestEntry = {
  /** Path relative to the bundle root. A trailing `/` means a folder. */
  path: string;
  /** What a person calls it. Falls back to the path. */
  label?: string;
  /** `logos` · `card` · `document` … — used to describe the row. */
  kind?: string;
  /** A sentence appended to the description, when there is one worth saying. */
  note?: string;
};

/** Something the export could not include, and why. */
export type KitManifestSkip = { label: string; reason: string };

/**
 * What the README is generated from.
 *
 * An array is the common case; the object form carries the extras the
 * whole-kit export has and a single-card download does not.
 */
export type KitManifest =
  | ReadonlyArray<KitManifestEntry>
  | {
      files: ReadonlyArray<KitManifestEntry>;
      skipped?: ReadonlyArray<KitManifestSkip>;
      /** Stamped into the header. A string is used verbatim. */
      generatedAt?: Date | string;
      /** Overrides the heading, for a single-deliverable download. */
      title?: string;
    };

type NormalizedManifest = {
  files: KitManifestEntry[];
  skipped: KitManifestSkip[];
  generatedAt?: Date | string;
  title?: string;
};

function normalize(manifest: KitManifest): NormalizedManifest {
  if (Array.isArray(manifest)) {
    return { files: [...(manifest as ReadonlyArray<KitManifestEntry>)], skipped: [] };
  }
  const object = manifest as Exclude<KitManifest, ReadonlyArray<KitManifestEntry>>;
  return {
    files: [...(object.files ?? [])],
    skipped: [...(object.skipped ?? [])],
    generatedAt: object.generatedAt,
    title: object.title,
  };
}

function brandName(brand: BrandStyleSource): string {
  const name = (brand as { name?: string } | null | undefined)?.name;
  return (name ?? '').trim() || 'This brand';
}

function stamp(value: Date | string | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (Number.isNaN(value.getTime())) return undefined;
  return value.toISOString().slice(0, 10);
}

/** `deliverables/business-card.png` → `PNG`; a folder → `folder`. */
function extensionOf(path: string): string {
  if (path.endsWith('/')) return 'folder';
  const dot = path.lastIndexOf('.');
  if (dot < 0 || dot === path.length - 1) return '';
  return path.slice(dot + 1).toLowerCase();
}

/**
 * What a row SAYS, when the manifest did not say it.
 *
 * Keyed on the extension rather than the family, because the reader is
 * looking at a file name and asking what to do with it.
 */
const BY_EXTENSION: Record<string, string> = {
  folder: 'A folder — open it, everything inside belongs to this item.',
  png: 'Screen artwork. Use it on the web, in a document, in a slide.',
  jpg: 'Flattened artwork on a solid ground, for anywhere that refuses transparency.',
  jpeg: 'Flattened artwork on a solid ground, for anywhere that refuses transparency.',
  svg: 'Vector artwork. Scales to any size with no loss — the file to hand a designer.',
  pdf: 'Print-ready, at the real page size. This is the file a printer wants.',
  ico: 'The classic favicon, for the bare `/favicon.ico` request every browser makes.',
  pptx: 'A real PowerPoint deck — editable slides, not pictures of slides.',
  docx: 'An editable Word document at the real page size.',
  html: 'Markup. Open it in a browser, or paste it where the instructions say.',
  txt: 'Plain text, for anywhere markup is refused.',
  json: 'Machine-readable data — for a build, a design tool, or an import.',
  webmanifest: 'The web app manifest. Ship it beside your `index.html`.',
  css: 'A stylesheet — drop it in and reference the variables it declares.',
  scss: 'Sass variables, for a build that compiles them.',
  md: 'Notes to read, not a file to ship.',
  zip: 'A bundle — unzip it and use what is inside.',
  gif: 'A looping animation, for anywhere a video will not play.',
  mp4: 'Video, for a site, a screen or a social upload.',
  ase: 'An Adobe swatch exchange file — import it into Illustrator, Photoshop or InDesign.',
  otf: 'A typeface file. Install it, or self-host it.',
  ttf: 'A typeface file. Install it, or self-host it.',
  woff: 'A web typeface file — reference it from your CSS.',
  woff2: 'A web typeface file — reference it from your CSS.',
};

function describe(entry: KitManifestEntry): string {
  const parts: string[] = [];
  const label = (entry.label ?? '').trim();
  if (label) parts.push(label + '.');
  const generic = BY_EXTENSION[extensionOf(entry.path)];
  if (generic) parts.push(generic);
  const note = (entry.note ?? '').trim();
  if (note) parts.push(note);
  return parts.join(' ').trim() || 'Part of this kit.';
}

/** Manifest order, first mention wins — a path listed twice is one row. */
function uniqueByPath(files: ReadonlyArray<KitManifestEntry>): KitManifestEntry[] {
  const seen = new Set<string>();
  const out: KitManifestEntry[] = [];
  for (const file of files) {
    const path = (file?.path ?? '').trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    out.push({ ...file, path });
  }
  return out;
}

/** A `|` inside a cell would end the column early. */
function cell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

/* ── The summary ──────────────────────────────────────────────────── */

/**
 * What each top-level folder of a kit holds, in one sentence.
 *
 * Keyed on the folder NAME because that is what the reader is looking at
 * in their file browser. A folder this does not know is described from
 * what is in it rather than left blank.
 */
const BY_FOLDER: Record<string, string> = {
  logos: 'Every logo variant the brand owns, as vector and as raster, on the grounds each was drawn for.',
  colors: 'The palette — swatch files, the values in every notation, and a sheet to hand a printer.',
  fonts: 'The typefaces, with the weights the brand uses and how to install or self-host them.',
  icons: 'The icon set, at the weights and sizes the brand draws them.',
  photos: 'The brand’s photography, plus the art direction every picture is treated to.',
  deliverables: 'The brand applied — cards, stationery, social, web, decks and the board. One file per design.',
};

/** `deliverables/business-card.pptx` → `PPTX`; a folder → nothing. */
function formatOf(path: string): string {
  const ext = extensionOf(path);
  return ext && ext !== 'folder' ? ext.toUpperCase() : '';
}

/** The first path segment, or '' for a file sitting at the root. */
function folderOf(path: string): string {
  const slash = path.indexOf('/');
  return slash < 0 ? '' : path.slice(0, slash);
}

/**
 * The kit, described rather than listed.
 *
 * Three passes over the manifest, and each answers a question a reader
 * actually has: what are these folders, what are the loose files, and which
 * deliverables did I get and in what formats.
 */
function summarize(rows: KitManifestEntry[]): string[] {
  const lines: string[] = [];

  const folders = new Map<string, { count: number; formats: Set<string> }>();
  const root: KitManifestEntry[] = [];
  /** Deliverable label → the formats it shipped in, in first-seen order. */
  const deliverables = new Map<string, string[]>();

  for (const row of rows) {
    const folder = folderOf(row.path);
    if (!folder) {
      root.push(row);
      continue;
    }
    const bucket = folders.get(folder) ?? { count: 0, formats: new Set<string>() };
    bucket.count += 1;
    const format = formatOf(row.path);
    if (format) bucket.formats.add(format);
    folders.set(folder, bucket);

    if (folder === 'deliverables') {
      // The manifest already says who owns each path; the label is what a
      // person calls the deliverable, which is what belongs in a summary.
      const label = row.label ?? row.path.slice(folder.length + 1).split('/')[0];
      const formats = deliverables.get(label) ?? [];
      if (format && !formats.includes(format)) formats.push(format);
      deliverables.set(label, formats);
    }
  }

  if (folders.size > 0) {
    lines.push('| Folder | What is in it | Files |', '| --- | --- | --- |');
    for (const [name, bucket] of folders) {
      const described =
        BY_FOLDER[name] ??
        (bucket.formats.size > 0
          ? `${[...bucket.formats].sort().join(' · ')} files.`
          : 'Part of this kit.');
      lines.push(`| \`${cell(name)}/\` | ${cell(described)} | ${bucket.count} |`);
    }
    lines.push('');
  }

  if (root.length > 0) {
    lines.push('At the top level:', '');
    for (const row of root) {
      lines.push(`- \`${cell(row.path)}\` — ${cell(describe(row))}`);
    }
    lines.push('');
  }

  if (deliverables.size > 0) {
    lines.push(
      `### The ${deliverables.size} deliverables`,
      '',
      'Each is the brand applied to one thing. Every one ships a PNG; where a',
      'format beyond it exists — a real deck, an icon container, markup, a',
      'print sheet — it sits beside the picture under the same name.',
      '',
      '| Deliverable | Formats |',
      '| --- | --- |',
    );
    for (const [label, formats] of deliverables) {
      lines.push(`| ${cell(label)} | ${cell(formats.join(' · ') || '—')} |`);
    }
    lines.push('');
  }

  return lines;
}

/* ── The document ─────────────────────────────────────────────────── */

export function buildKitReadme(brand: BrandStyleSource, manifest: KitManifest): string {
  const { files, skipped, generatedAt, title } = normalize(manifest);
  const rows = uniqueByPath(files);
  const name = brandName(brand);
  const date = stamp(generatedAt);
  const colors = brandColors(brand);
  const heading = fontFamily(brand, 'heading');
  const body = fontFamily(brand, 'body');

  const lines: string[] = [];

  lines.push(`# ${title?.trim() || `${name} — Brand Kit`}`, '');
  lines.push(
    'Everything in this folder was generated from the brand itself, so it is',
    'already consistent: the same colours, the same typefaces and the same logo',
    'artwork appear in every file below. Nothing here needs to be recoloured or',
    'retyped before it is used.',
    '',
  );
  if (date) lines.push(`Exported ${date}.`, '');

  /* What is in here */
  lines.push('## What is in this folder', '');
  if (rows.length === 0) {
    lines.push('Nothing — this export produced no files. See the note at the end.', '');
  } else {
    lines.push(...summarize(rows));
  }

  /* The download vocabulary */
  lines.push(
    '## Getting another copy, or another size',
    '',
    'Every card, tile and drilldown in the Brand Kit offers the same five',
    'downloads, in the same words:',
    '',
    '- **For web** — a PNG, at the size the design is drawn at. The default, and',
    '  the right answer for a screen, a document or a slide.',
    '- **For print** — a PDF at the deliverable’s real page size (a business card',
    '  comes out 85 × 55 mm, not "an image"). Send this one to a printer.',
    '- **Vector** — an SVG. Infinitely scalable and editable; hand it to a',
    '  designer, or use it anywhere the artwork has to be very large or very',
    '  small. Offered wherever the artwork is genuinely vector.',
    '- **Flattened** — a JPG on a solid ground, for the places that refuse',
    '  transparency (some ad platforms, some legacy uploaders).',
    '- **Custom size…** — type the exact width and height you need, choose the',
    '  padding and the background, and take the PNG. Use this before you scale',
    '  anything by hand: a re-export is sharp, a stretched image is not.',
    '',
  );

  /* Formats */
  lines.push(
    '## What each format is for',
    '',
    '| Format | Use it when |',
    '| --- | --- |',
    '| PNG | It goes on a screen. Keeps transparency; fixed pixel size. |',
    '| JPG | The destination refuses transparency. Smaller file, solid ground. |',
    '| SVG | It has to scale — signage, a huge header, a tiny favicon, or any edit. |',
    '| PDF | It is going to print, or to somebody who needs the real page size. |',
    '| PPTX | Somebody has to present it, or fix a typo in it. |',
    '| ICO | A browser is asking for `/favicon.ico`. |',
    '| HTML | It is pasted into an email client or a page `<head>`. |',
    '| JSON / CSS | A build consumes it — tokens, a manifest, a stylesheet. |',
    '',
    'A PNG is a picture of the design. Everywhere a native format exists —',
    'PDF for print, PPTX for a deck, SVG for a logo, HTML for a signature — use',
    'that instead: it is the same design, still editable.',
    '',
  );

  /* The logo rules */
  lines.push(
    '## Using the logo',
    '',
    '**Clear space.** Leave **R** clear on every side of the logo, where R is one',
    'third of the logo’s smaller dimension. Nothing enters that margin — no type,',
    'no rule, no image edge, no other mark. On a 90 px tall lockup, R is 30 px.',
    '',
    '**Minimum size.** The logo is drawn to read at 24 px tall and must never be',
    'placed smaller. Use 48 px where it has to survive a screenshot or a low-',
    'quality print, and 96 px wherever the logo is the subject rather than a',
    'signature.',
    '',
    '**Backgrounds.** Use the variant that was exported for that ground. Each one',
    'was contrast-checked against the colour it sits on; picking a different cut',
    'by eye is how a logo ends up invisible on the brand’s own colour.',
    '',
    '**Never** recolour, stretch, rotate, outline, add a shadow to, or rebuild the',
    'logo. If the artwork you need is not in this folder, export it — do not make',
    'it.',
    '',
  );

  /* The brand, in one line */
  const facts: string[] = [];
  facts.push(`- Primary colour: \`${colors.primary}\``);
  facts.push(`- Secondary colour: \`${colors.secondary}\``);
  if (colors.accent.length > 0) {
    facts.push(`- Accents: ${colors.accent.map((hex) => `\`${hex}\``).join(', ')}`);
  }
  if (heading) facts.push(`- Headings: ${heading}`);
  if (body) facts.push(`- Body: ${body}`);
  lines.push('## The brand, in short', '', ...facts, '');

  /* What did not make it */
  if (skipped.length > 0) {
    lines.push(
      '## Not in this export',
      '',
      'These were asked for and could not be included. Nothing is missing by',
      'accident:',
      '',
      ...skipped.map((s) => `- **${s.label}** — ${s.reason}.`),
      '',
    );
  }

  return `${lines.join('\n')}\n`;
}

/** The same document as the file the bundle carries. */
export function buildKitReadmeFile(
  brand: BrandStyleSource,
  manifest: KitManifest,
  path = 'README.md',
): ExportFile {
  return { path, blob: textBlob(buildKitReadme(brand, manifest), 'text/markdown;charset=utf-8') };
}
