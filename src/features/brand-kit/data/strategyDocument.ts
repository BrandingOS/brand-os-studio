/**
 * The brand's strategy, as documents a person can actually read.
 *
 * The kit used to export `about.md` — the free-form sections and nothing
 * else — so the eleven answers a user gives in onboarding and edits in
 * Setup left no trace in the download. A brand kit that describes the
 * colours and omits what the brand IS has exported the packaging.
 *
 * FOUR artefacts now, and the reason there are four is that they answer
 * four different questions. `.audit/OURS.md` D66 measured the failure
 * mode of NOT deciding this: `about.md` held the Vision and the Voice,
 * `strategy.md` held the eleven answers, and neither was a document —
 * they were two halves of one, filed under names that did not say which
 * half you had.
 *
 *  • `about.md` — **what this brand is, in a page.** The slogan, the
 *    summary, the identity facts, the links. The thing you paste into a
 *    press kit, a README or a brief. It is deliberately SHORT and it ends
 *    by naming its siblings, so a reader who wants more knows where more
 *    is. It does NOT repeat the notes or the voice.
 *  • `strategy.md` — **the whole record.** Every answered card, the
 *    free-form notes, the voice. For a person's notes, a repo, an LLM.
 *  • `strategy.json` — **the same record as data.** Ids AND labels, so a
 *    consumer can render it without owning our vocabulary and write it
 *    back without guessing at ours.
 *  • `strategy.pdf` — **the designed document**, for sending to someone.
 *    (`brand-book.pdf`, in `brandBook.ts`, is its bigger sibling: what
 *    the brand LOOKS like, applied. Same paper, same cover, same family.)
 *
 * Every one of them reads `STRATEGY_CARDS`, which is Setup's own list in
 * Setup's own order under Setup's own names, so no export can describe
 * the brand differently from the screen the user filled in. And every one
 * of them opens by saying WHAT IT IS and naming the others — a file in a
 * zip is read by someone who was not in the room.
 */
import type { Brand } from '@/shared/types/brand';
import type { BrandFontFile, MockBrand } from '@/features/setup/data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';
import { buildBrandPalette, pickSurfaceTokens, type BrandPalette } from '@/shared/brand/brandPalette';
import { pickLogoOnBackground, pickFgOnBackground, contrastRatio } from '@/shared/brand/logoOnBackground';
import { rasterizeLogo } from '@/shared/brand/rasterizeLogo';
import { gatherFamilyFiles } from './fontExport';
import { slugify, triggerBlobDownload } from './colorPaletteExport';
import { zipAdd, type ZipFolder } from './zipFile';
import { buildKitReadmeFile, type KitManifestSkip } from '../exporters/readme';
import type { ExportFile } from '../exporters/types';

/* ─── Markdown ────────────────────────────────────────────────────── */

/**
 * The one line every strategy document opens with.
 *
 * Not decoration: these files travel in a zip to somebody who did not
 * export them, and the first question they ask is "which of these do I
 * read?". Naming the siblings from inside each file is the only place
 * that answer survives being copied out of the folder.
 */
function lede(self: 'about' | 'strategy' | 'json'): string {
  const others: Record<typeof self, string> = {
    about:
      'What this brand is, in a page. The whole strategy — every answer, the ' +
      'notes and the voice — is in `strategy.md`; the same record as data is in ' +
      '`strategy.json`; the designed version is `brand-book.pdf`.',
    strategy:
      'The whole brand strategy: every answer given in Setup, the notes written ' +
      'beside them, and the voice. `about.md` is the short version; ' +
      '`strategy.json` is this same record as data; `brand-book.pdf` is the ' +
      'designed document.',
    json: '',
  };
  return others[self];
}

/** `Website — https://…`, and only when there is one. */
function factLines(brand: MockBrand): string[] {
  const facts: string[] = [];
  const say = (label: string, value: string | undefined) => {
    const text = (value ?? '').trim();
    if (text) facts.push(`- **${label}** — ${text}`);
  };
  const card = (key: string) => {
    const found = STRATEGY_CARDS.find((c) => c.key === key);
    return found && brand.strategy ? contentOf(found, brand.strategy) : '';
  };
  say('Industry', card('industry'));
  say('Products / Services', card('products'));
  say('Audience', card('audience'));
  say('Positioning', card('positioning'));
  const site = (brand.websites ?? []).find((w) => w.url?.trim())?.url;
  say('Website', site);
  const links = (brand.links ?? [])
    .filter((l) => l.url?.trim())
    .map((l) => (l.label?.trim() ? `${l.label.trim()} (${l.url.trim()})` : l.url.trim()));
  if (links.length > 0) facts.push(`- **Links** — ${links.join(', ')}`);
  return facts;
}

/**
 * `about.md` — the brand described, short, for someone who has thirty seconds.
 *
 * Deliberately NOT a subset of `strategy.md`: it carries the slogan, the
 * summary and the identity facts, and it defers the notes and the voice
 * rather than repeating half of them. Two files that each hold a piece of
 * one document is the thing D66 measured; two files that each are a whole
 * document with a different job is not.
 *
 * Keeps `# <name>` as its first line — several callers and one test read
 * the heading, and the brand's own name is the right title for a page
 * about the brand.
 */
export function buildAboutMarkdown(brand: MockBrand): string {
  const lines: string[] = [`# ${brand.name}`, '', `_${lede('about')}_`, ''];

  const slogan = brand.strategy?.slogan?.trim();
  if (slogan) lines.push(`> ${slogan}`, '');

  const summary = brand.strategy?.summary?.trim();
  const mission = brand.strategy?.mission?.trim();
  if (summary) lines.push(summary, '');
  else if (mission) lines.push(mission, '');

  const facts = factLines(brand);
  if (facts.length > 0) lines.push('## In short', '', ...facts, '');

  if (summary && mission) lines.push('## Mission', '', mission, '');

  // Nothing at all is a real state, and saying so beats an empty page.
  if (!slogan && !summary && !mission && facts.length === 0) {
    lines.push(
      'This brand has not described itself yet. Fill it in at Setup → Brand Strategy',
      'and export again.',
      '',
    );
  }

  lines.push(
    '## Where the rest is',
    '',
    '- `strategy.md` — every strategy answer, the notes and the voice.',
    '- `strategy.json` — the same record as data, ids and labels together.',
    '- `brand-book.pdf` — the designed document: the logo, the palette, the type,',
    '  the voice and the brand applied.',
    '',
  );
  return lines.join('\n');
}

/** The eleven answers, the free-form sections and the voice, as one file. */
export function buildStrategyMarkdown(brand: MockBrand): string {
  const lines: string[] = [
    `# ${brand.name} — Brand strategy`,
    '',
    `_${lede('strategy')}_`,
    '',
    '## Brand strategy',
    '',
  ];
  let answered = 0;
  for (const card of STRATEGY_CARDS) {
    const value = brand.strategy ? contentOf(card, brand.strategy) : '';
    if (!value) continue;
    answered += 1;
    lines.push(`**${card.name}**`, '', value, '');
  }
  if (answered === 0) {
    lines.push('_Not yet answered. Fill this in at Setup → Brand Strategy._', '');
  }

  const sections = brand.about?.filter((s) => s.content.trim()) ?? [];
  if (sections.length > 0) {
    lines.push('## Notes', '');
    for (const s of sections) lines.push(`### ${s.title}`, '', s.content.trim(), '');
  }
  if (brand.voice?.essay?.trim()) {
    lines.push('## Voice', '', brand.voice.essay.trim(), '');
  }
  const pillars = (brand.voice?.pillars ?? []).filter((p) => p.trim());
  if (pillars.length > 0) {
    lines.push('### Pillars', '', ...pillars.map((p) => `- ${p.trim()}`), '');
  }
  return lines.join('\n');
}

/**
 * The same strategy, as data.
 *
 * `strategy.md` is for a person and `strategy.pdf` is for sending; this is
 * for a machine — a repo, a CMS seed, an LLM given the brand as context.
 * It carries the vocabulary IDS as stored AND the label a person reads,
 * because a consumer that only got `"b2b-saas"` would have to own a copy
 * of our vocabulary to render it, and a consumer that only got the label
 * could never write it back.
 *
 * `$schema`-less on purpose, but it does carry `document`: a JSON file in
 * a zip has no lede to open with, so the description that the other three
 * files print at the top is a FIELD here.
 */
export function buildStrategyJson(brand: MockBrand): string {
  const answers = STRATEGY_CARDS.map((card) => ({
    key: card.key,
    label: card.name,
    /** Raw as stored: a vocabulary id, a list of them, or the user's prose. */
    value: brand.strategy ? brand.strategy[card.key] ?? '' : '',
    /** The same answer as a person reads it. Empty means unanswered. */
    text: brand.strategy ? contentOf(card, brand.strategy) : '',
  }));
  return JSON.stringify(
    {
      document: {
        what: `${brand.name} — brand strategy, as data.`,
        siblings: {
          'about.md': 'What this brand is, in a page.',
          'strategy.md': 'The same record as prose.',
          'brand-book.pdf': 'The designed document: the brand applied.',
        },
      },
      name: brand.name,
      strategy: answers,
      notes: (brand.about ?? [])
        .filter((s) => s.content.trim())
        .map((s) => ({ title: s.title, content: s.content.trim() })),
      voice: {
        essay: brand.voice?.essay?.trim() ?? '',
        pillars: brand.voice?.pillars ?? [],
      },
    },
    null,
    2,
  );
}

/* ─── PDF ─────────────────────────────────────────────────────────── */

/**
 * A4 in points, and the margin every page in the kit's documents keeps.
 *
 * Exported because the brand book (`brandBook.ts`) is the same document
 * family — same paper, same margin, same cover — and two modules that
 * disagree about the page size produce two documents that cannot be
 * bound together.
 */
export const A4 = { w: 595.28, h: 841.89 };
export const MARGIN = 56;

export type Ink = { heading: string; body: string; muted: string; rule: string };

/** jsPDF wants `[r,g,b]`; the brand speaks hex. */
export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6) || '000000', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Does this sfnt carry an `fvar` table — i.e. is it a VARIABLE font?
 *
 * Google Fonts serves Inter and DM Sans (and most of its catalogue now)
 * as variable faces, and jsPDF's TrueType embedder cannot render one: the
 * whole document came out as a single stray glyph per line, which reads
 * as a broken export rather than as a font problem. So a variable file is
 * refused and the document falls back to a core font.
 *
 * Parses the table directory only — 12 bytes of header, 16 per record.
 */
export function isVariableFont(bytes: Uint8Array): boolean {
  try {
    if (bytes.length < 12) return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const numTables = view.getUint16(4);
    if (numTables > 512) return false;
    for (let i = 0; i < numTables; i += 1) {
      const at = 12 + i * 16;
      if (at + 4 > bytes.length) break;
      const tag = String.fromCharCode(
        bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3],
      );
      if (tag === 'fvar') return true;
    }
    return false;
  } catch {
    return true; // Unreadable is not worth risking a broken document over.
  }
}

/** Pick the file in a family that reads as the given weight. */
function pickWeight<T extends { baseName: string }>(files: T[], want: 'regular' | 'bold'): T | undefined {
  const score = (name: string) => {
    const n = name.toLowerCase();
    if (want === 'bold') {
      if (/bold|700|600|semibold/.test(n)) return 0;
      if (/medium|500/.test(n)) return 1;
      return 2;
    }
    if (/italic|oblique/.test(n)) return 3;
    if (/regular|400/.test(n)) return 0;
    if (/light|300/.test(n)) return 1;
    return 2;
  };
  return [...files].sort((a, b) => score(a.baseName) - score(b.baseName))[0];
}

/**
 * A STATIC cut of a Google family, which is the only kind jsPDF can set.
 *
 * `gatherFamilyFiles` asks the Google CSS API, and for Inter, DM Sans and
 * most of the modern catalogue the API answers with ONE variable file per
 * family. `isVariableFont` then refuses it — correctly, it renders as one
 * stray glyph a line — and the document silently fell back to Helvetica.
 * Measured on Raqm: a typography page captioned "Inter" and "DM Sans" that
 * showed two identical Helvetica specimens. A brand book set in a typeface
 * the brand does not own is the one lie a brand book must not tell.
 *
 * So when the API can only offer a variable file, the static per-weight cut
 * is fetched from Fontsource — the same upstream files, published one
 * weight at a time. The bytes come back as an `uploaded` family, which
 * means `gatherFamilyFiles` does the WOFF2→TTF decompression rather than a
 * second copy of it living here.
 *
 * Latin only, two weights, ~100 KB a family. A miss is silent: the family
 * simply keeps Helvetica, as it did before.
 */
const FONTSOURCE = 'https://cdn.jsdelivr.net/npm/@fontsource';

/** `DM Sans` → `dm-sans`, which is how Fontsource names its packages. */
export function fontsourceId(family: string): string {
  return family
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function fetchStaticCut(
  family: string,
  weight: number,
  signal?: AbortSignal,
): Promise<BrandFontFile | null> {
  const id = fontsourceId(family);
  if (!id) return null;
  try {
    const res = await fetch(`${FONTSOURCE}/${id}/files/${id}-latin-${weight}-normal.woff2`, {
      signal,
    });
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.length === 0) return null;
    return {
      name: `${id}-${weight}.woff2`,
      weight: String(weight),
      format: 'woff2',
      dataUrl: `data:font/woff2;base64,${bytesToBase64(bytes)}`,
      size: bytes.length,
    };
  } catch {
    return null;
  }
}

/**
 * Embed the brand's real typeface so the document is SET in the brand,
 * not merely coloured like it.
 *
 * Falls back to Helvetica without complaint — a strategy PDF in the wrong
 * typeface is worth having; no PDF at all is not. But it REPORTS the
 * fallback in `embedded`, because a specimen page captioned with a family
 * name it is not set in has to say so.
 */
export type BrandFontNames = {
  heading: string;
  body: string;
  /** Families whose own files are really in the document, by family name. */
  embedded: string[];
};

export async function embedBrandFonts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  brand: MockBrand,
  signal?: AbortSignal,
): Promise<BrandFontNames> {
  const names: BrandFontNames = { heading: 'helvetica', body: 'helvetica', embedded: [] };
  const families = (brand.fonts ?? []).slice(0, 2);
  if (families.length === 0) return names;

  const roles: Array<'heading' | 'body'> = ['heading', 'body'];
  for (let i = 0; i < families.length && i < 2; i += 1) {
    if (signal?.aborted) return names;
    const fam = families[i];
    try {
      // Latin only: a subset font embedded here renders every line as
      // whichever glyph it happens to contain (see `latinOnly`).
      const gathered = await gatherFamilyFiles(
        { name: fam.family, files: fam.files },
        { latinOnly: true, signal },
      );
      let files = gathered.files.filter((f) => !isVariableFont(f.ttfBytes));
      if (files.length === 0 && (fam.files ?? []).length === 0) {
        // Everything Google had for this family is variable — see above.
        const cuts = (
          await Promise.all([400, 700].map((w) => fetchStaticCut(fam.family, w, signal)))
        ).filter((f): f is BrandFontFile => Boolean(f));
        if (cuts.length > 0) {
          const retry = await gatherFamilyFiles(
            { name: fam.family, files: cuts },
            { latinOnly: true, signal },
          );
          files = retry.files.filter((f) => !isVariableFont(f.ttfBytes));
        }
      }
      if (files.length === 0) continue;
      const alias = `brand${i}`;
      const regular = pickWeight(files, 'regular');
      const bold = pickWeight(files, 'bold') ?? regular;
      if (!regular || !bold) continue;
      pdf.addFileToVFS(`${alias}-regular.ttf`, bytesToBase64(regular.ttfBytes));
      pdf.addFont(`${alias}-regular.ttf`, alias, 'normal');
      pdf.addFileToVFS(`${alias}-bold.ttf`, bytesToBase64(bold.ttfBytes));
      pdf.addFont(`${alias}-bold.ttf`, alias, 'bold');
      names.embedded.push(fam.family);
      // One family declared: it sets both roles. Two: first heads, second reads.
      if (i === 0) {
        names.heading = alias;
        names.body = alias;
      } else names[roles[1]] = alias;
    } catch {
      // A family we could not gather — the next role keeps Helvetica.
    }
  }
  return names;
}

/** The logo, as PNG bytes that read on the given ground. */
export async function logoForGround(
  sourceBrand: Brand | undefined,
  ground: string,
): Promise<string | null> {
  if (!sourceBrand) return null;
  const picked = pickLogoOnBackground(sourceBrand, ground);
  if (!picked?.url) return null;
  try {
    return await rasterizeLogo(picked.url, { size: 1024, padding: 0 });
  } catch {
    return null;
  }
}

/**
 * The cover every kit document shares.
 *
 * A brand-coloured field, the mark that reads on it, the slogan, and a
 * band of the brand's own colours along the foot — the cover says what
 * the document is about before a word of it is read. It is shared rather
 * than copied because the strategy PDF and the brand book are the same
 * document family; two covers that drift apart read as two products.
 *
 * Every colour decision goes through `brandPalette` / `logoOnBackground`
 * rather than reaching for `primaryColor` — this is exactly the case
 * those modules exist for, a mark on a brand-coloured ground.
 */
export async function paintCover(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  opts: {
    brand: MockBrand;
    sourceBrand?: Brand;
    fonts: BrandFontNames;
    palette: BrandPalette;
    /** The line along the foot. What this document IS. */
    kicker: string;
  },
): Promise<void> {
  const { brand, sourceBrand, fonts, palette, kicker } = opts;
  const coverGround = palette.brand.primary || brand.colors.core[0]?.hex || '#111113';
  const coverInk = pickFgOnBackground(coverGround, ['#FFFFFF', '#111113']);

  pdf.setFillColor(...rgb(coverGround));
  pdf.rect(0, 0, A4.w, A4.h, 'F');

  const logo = await logoForGround(sourceBrand, coverGround);
  let cursor = A4.h * 0.42;
  let placedLogo = false;
  if (logo) {
    const box = 170;
    try {
      pdf.addImage(logo, 'PNG', (A4.w - box) / 2, cursor - box, box, box, undefined, 'FAST');
      placedLogo = true;
      cursor += 26;
    } catch {
      // An image jsPDF could not decode — the wordmark below still lands.
    }
  }

  pdf.setTextColor(...rgb(coverInk));
  // The logo IS the name for most brands. Printing "Raqm" under Raqm's own
  // wordmark says it twice and reads as a placeholder.
  if (!placedLogo) {
    pdf.setFont(fonts.heading, 'bold');
    pdf.setFontSize(34);
    pdf.text(brand.name, A4.w / 2, cursor, { align: 'center', maxWidth: A4.w - MARGIN * 2 });
    cursor += 28;
  }

  const slogan = brand.strategy?.slogan?.trim();
  if (slogan) {
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(13);
    pdf.text(slogan, A4.w / 2, cursor, { align: 'center', maxWidth: A4.w - MARGIN * 2 });
  }

  const band = [...(brand.colors.core ?? []), ...(brand.colors.accent ?? [])]
    .map((c) => c.hex)
    .filter(Boolean)
    // A swatch the same colour as the ground it sits on is a gap in the
    // band, not a colour — and the ground is usually the brand's primary,
    // so this is the common case rather than an edge one.
    .filter((hex) => contrastRatio(hex, coverGround) >= 1.25)
    .slice(0, 8);
  if (band.length > 0) {
    const h = 10;
    const w = (A4.w - MARGIN * 2) / band.length;
    band.forEach((hex, i) => {
      pdf.setFillColor(...rgb(hex));
      pdf.rect(MARGIN + i * w, A4.h - MARGIN - 34, w, h, 'F');
    });
  }

  pdf.setTextColor(...rgb(coverInk));
  pdf.setFont(fonts.body, 'normal');
  pdf.setFontSize(9);
  pdf.text(kicker, A4.w / 2, A4.h - MARGIN, { align: 'center', charSpace: 2 });
}

export type StrategyPdfOptions = { signal?: AbortSignal };

/**
 * A designed brand-strategy document.
 *
 * Cover on the brand's own colour, a palette page with real hex codes, a
 * typography specimen, then the eleven answers as a reading document. The
 * text is VECTOR, not a screenshot of a web page: it selects, searches,
 * prints and survives being zoomed, which is most of what makes a PDF
 * worth having over a PNG.
 *
 * Every colour decision goes through `brandPalette` / `logoOnBackground`
 * rather than reaching for `primaryColor` — this is exactly the case
 * those modules exist for, a mark on a brand-coloured ground.
 */
export async function buildStrategyPdf(
  brand: MockBrand,
  sourceBrand?: Brand,
  opts: StrategyPdfOptions = {},
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const fonts = await embedBrandFonts(pdf, brand, opts.signal);

  const palette = buildBrandPalette(sourceBrand, 'light');
  const page = pickSurfaceTokens(palette, 'page');
  const ink: Ink = {
    heading: page.text,
    body: page.text,
    muted: page.textMuted,
    rule: page.border,
  };
  await paintCover(pdf, {
    brand,
    sourceBrand,
    fonts,
    palette,
    kicker: 'BRAND STRATEGY',
  });

  /* ── The answers ────────────────────────────────────────────────── */
  pdf.addPage();
  let y = MARGIN + 10;
  const width = A4.w - MARGIN * 2;

  const needRoom = (space: number) => {
    if (y + space <= A4.h - MARGIN) return;
    pdf.addPage();
    y = MARGIN + 10;
  };

  const sectionTitle = (text: string) => {
    needRoom(60);
    pdf.setFont(fonts.heading, 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...rgb(ink.heading));
    pdf.text(text, MARGIN, y);
    y += 12;
    pdf.setDrawColor(...rgb(ink.rule));
    pdf.setLineWidth(0.7);
    pdf.line(MARGIN, y, MARGIN + width, y);
    y += 24;
  };

  const answer = (label: string, value: string) => {
    // Measure in the font the text will be SET in. Splitting while the
    // label's 8.5pt bold was still active produced lines measured for one
    // font and drawn in another, and every paragraph ran off the page.
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(11);
    const body = pdf.splitTextToSize(value, width) as string[];
    needRoom(20 + body.length * 15 + 18);

    pdf.setFont(fonts.body, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...rgb(palette.brand.primary || ink.heading));
    pdf.text(label.toUpperCase(), MARGIN, y, { charSpace: 1.2 });
    y += 16;

    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...rgb(ink.body));
    pdf.text(body, MARGIN, y, { lineHeightFactor: 1.35 });
    y += body.length * 15 + 18;
  };

  sectionTitle('Brand strategy');
  let answered = 0;
  for (const card of STRATEGY_CARDS) {
    const value = brand.strategy ? contentOf(card, brand.strategy) : '';
    if (!value) continue;
    answered += 1;
    answer(card.name, value);
  }
  if (answered === 0) {
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(...rgb(ink.muted));
    pdf.text('Not yet answered — fill this in at Setup → Brand Strategy.', MARGIN, y);
    y += 24;
  }

  /* ── Palette ────────────────────────────────────────────────────── */
  const swatches = [
    ...(brand.colors.core ?? []).map((c) => ({ ...c, role: 'Core' })),
    ...(brand.colors.accent ?? []).map((c) => ({ ...c, role: 'Accent' })),
  ].filter((c) => c.hex);

  if (swatches.length > 0) {
    pdf.addPage();
    y = MARGIN + 10;
    sectionTitle('Colour');
    const COLS = 3;
    const gap = 16;
    const cell = (width - gap * (COLS - 1)) / COLS;
    const chip = 62;
    for (let i = 0; i < swatches.length; i += 1) {
      const col = i % COLS;
      if (col === 0) needRoom(chip + 46);
      const x = MARGIN + col * (cell + gap);
      const top = y;
      pdf.setFillColor(...rgb(swatches[i].hex));
      pdf.setDrawColor(...rgb(ink.rule));
      pdf.setLineWidth(0.5);
      pdf.roundedRect(x, top, cell, chip, 5, 5, 'FD');
      pdf.setFont(fonts.body, 'bold');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...rgb(ink.heading));
      pdf.text(swatches[i].name || swatches[i].hex, x, top + chip + 15, { maxWidth: cell });
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...rgb(ink.muted));
      pdf.text(`${swatches[i].hex.toUpperCase()} · ${swatches[i].role}`, x, top + chip + 27);
      if (col === COLS - 1 || i === swatches.length - 1) y = top + chip + 46;
    }
  }

  /* ── Typography ─────────────────────────────────────────────────── */
  if ((brand.fonts ?? []).length > 0) {
    pdf.addPage();
    y = MARGIN + 10;
    sectionTitle('Typography');
    for (const fam of brand.fonts) {
      needRoom(76);
      pdf.setFont(fonts.heading, 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(...rgb(ink.heading));
      pdf.text('Aa Bb Cc 123', MARGIN, y);
      y += 20;
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(...rgb(ink.muted));
      pdf.text(`${fam.family} — ${fam.weights || 'Regular'}`, MARGIN, y);
      y += 34;
    }
  }

  /* ── Notes + voice ──────────────────────────────────────────────── */
  const notes = (brand.about ?? []).filter((s) => s.content.trim());
  if (notes.length > 0 || brand.voice?.essay?.trim()) {
    pdf.addPage();
    y = MARGIN + 10;
    sectionTitle('Notes');
    for (const s of notes) answer(s.title, s.content.trim());
    if (brand.voice?.essay?.trim()) answer('Voice', brand.voice.essay.trim());
  }

  /* ── Page numbers ───────────────────────────────────────────────── */
  const total = pdf.getNumberOfPages();
  for (let i = 2; i <= total; i += 1) {
    pdf.setPage(i);
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...rgb(ink.muted));
    pdf.text(`${brand.name} · Brand strategy`, MARGIN, A4.h - 30);
    pdf.text(`${i - 1}`, A4.w - MARGIN, A4.h - 30, { align: 'right' });
  }

  return pdf.output('blob') as Blob;
}

/* ─── The download ────────────────────────────────────────────────── */

/**
 * What the Strategy card's ⬇ hands over, as pure files.
 *
 * A builder rather than a download, for the reason every exporter here is
 * one: a test can read the bytes back, and the caller decides whether they
 * become a zip, a folder in a bigger zip, or nothing.
 *
 * The set is the print artefact plus the two machine-and-person copies —
 * `brand-book.pdf`, `strategy.md`, `strategy.json` — and a README written
 * from THIS manifest, so it cannot name a file that is not in the bundle.
 * `strategy.pdf` rides along too when the book could not be built: the
 * strategy alone still deserves a designed document.
 */
/** What each file in the bundle is FOR — the README's own words. */
const FILE_NOTES: Record<string, { label?: string; note?: string }> = {
  'brand-book.pdf': {
    label: 'The brand book',
    note:
      'The designed document: the mark and its clear space, the palette with the ' +
      'numbers a printer asks for, the type as a scale, the voice, the strategy, ' +
      'and the brand applied. Send this one.',
  },
  'strategy.pdf': {
    label: 'The strategy, designed',
    note: 'The written strategy as a document to send. Set in the brand’s own typeface.',
  },
  'strategy.md': {
    label: 'The strategy, in full',
    note:
      'Every answer given in Setup, the notes beside them and the voice. Read it, ' +
      'paste it into a brief, or hand it to an assistant as context.',
  },
  'strategy.json': {
    label: 'The strategy, as data',
    note:
      'The same record with the stored ids AND the labels a person reads, so it can ' +
      'be rendered without our vocabulary and written back without guessing.',
  },
};

export type StrategyBundle = {
  files: ExportFile[];
  /** Anything asked for and not included, with the reason. Never silent. */
  skipped: KitManifestSkip[];
};

const TEXT = 'text/markdown;charset=utf-8';

export async function buildStrategyBundle(
  brand: MockBrand,
  sourceBrand?: Brand,
  opts: { signal?: AbortSignal } = {},
): Promise<StrategyBundle> {
  const files: ExportFile[] = [];
  const skipped: KitManifestSkip[] = [];

  files.push({
    path: 'strategy.md',
    blob: new Blob([buildStrategyMarkdown(brand)], { type: TEXT }),
  });
  files.push({
    path: 'strategy.json',
    blob: new Blob([buildStrategyJson(brand)], { type: 'application/json;charset=utf-8' }),
  });

  // The book is the reason this download exists, and it is also the one
  // part that can fail — it renders four applications through the whole
  // template library. A failure costs the book, never the bundle.
  let book = false;
  try {
    const { buildBrandBook } = await import('./brandBook');
    const built = await buildBrandBook(brand, sourceBrand, { signal: opts.signal });
    files.push({ path: 'brand-book.pdf', blob: built.blob });
    skipped.push(...built.skipped.map((s) => ({ label: s.label, reason: s.reason })));
    book = true;
  } catch (err) {
    if ((err as { name?: string })?.name === 'ExportCancelled') throw err;
    skipped.push({
      label: 'Brand book',
      reason: err instanceof Error ? err.message : 'the document could not be built',
    });
  }

  if (!book) {
    try {
      files.push({
        path: 'strategy.pdf',
        blob: await buildStrategyPdf(brand, sourceBrand, { signal: opts.signal }),
      });
    } catch (err) {
      if ((err as { name?: string })?.name === 'ExportCancelled') throw err;
      skipped.push({
        label: 'Strategy PDF',
        reason: err instanceof Error ? err.message : 'the document could not be built',
      });
    }
  }

  files.push(
    buildKitReadmeFile(
      brand,
      {
        title: `${brand.name} — Brand strategy`,
        files: [
          { path: 'README.md', label: 'This file' },
          ...files.map((f) => ({ path: f.path, ...FILE_NOTES[f.path] })),
        ],
        skipped,
        generatedAt: new Date(),
      },
      'README.md',
    ),
  );

  return { files, skipped };
}

/**
 * The Strategy card's ⬇ — the bundle, zipped and handed over.
 *
 * Returns what it skipped so the caller can say so out loud; a download
 * that quietly leaves out the book is a download that lied.
 */
export async function downloadStrategyBundle(
  brand: MockBrand,
  sourceBrand?: Brand,
  opts: { signal?: AbortSignal } = {},
): Promise<KitManifestSkip[]> {
  const { files, skipped } = await buildStrategyBundle(brand, sourceBrand, opts);
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const file of files) zipAdd(zip as unknown as ZipFolder, file.path, file.blob);
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, `${slugify(brand.name) || 'brand'}-strategy.zip`);
  return skipped;
}
