/**
 * The brand's strategy, as documents a person can actually read.
 *
 * The kit used to export `about.md` — the free-form sections and nothing
 * else — so the eleven answers a user gives in onboarding and edits in
 * Setup left no trace in the download. A brand kit that describes the
 * colours and omits what the brand IS has exported the packaging.
 *
 * Two artefacts, because they are read by different things:
 *
 *  • `strategy.md` — plain text, for a person's notes, a repo, an LLM.
 *  • `strategy.pdf` — a designed document, for sending to someone.
 *
 * Both read `STRATEGY_CARDS`, which is Setup's own list in Setup's own
 * order under Setup's own names, so the export cannot describe the brand
 * differently from the screen the user filled in.
 */
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';
import { buildBrandPalette, pickSurfaceTokens } from '@/shared/brand/brandPalette';
import { pickLogoOnBackground, pickFgOnBackground, contrastRatio } from '@/shared/brand/logoOnBackground';
import { rasterizeLogo } from '@/shared/brand/rasterizeLogo';
import { gatherFamilyFiles } from './fontExport';

/* ─── Markdown ────────────────────────────────────────────────────── */

/** The eleven answers, the free-form sections and the voice, as one file. */
export function buildStrategyMarkdown(brand: MockBrand): string {
  const lines: string[] = [`# ${brand.name}`, '', '## Brand strategy', ''];
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
  return lines.join('\n');
}

/* ─── PDF ─────────────────────────────────────────────────────────── */

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 56;

type Ink = { heading: string; body: string; muted: string; rule: string };

/** jsPDF wants `[r,g,b]`; the brand speaks hex. */
function rgb(hex: string): [number, number, number] {
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
function isVariableFont(bytes: Uint8Array): boolean {
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
 * Embed the brand's real typeface so the document is SET in the brand,
 * not merely coloured like it.
 *
 * Falls back to Helvetica without complaint — a strategy PDF in the wrong
 * typeface is worth having; no PDF at all is not.
 */
async function embedBrandFonts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  brand: MockBrand,
  signal?: AbortSignal,
): Promise<{ heading: string; body: string }> {
  const fallback = { heading: 'helvetica', body: 'helvetica' };
  const families = (brand.fonts ?? []).slice(0, 2);
  if (families.length === 0) return fallback;

  const names = { ...fallback };
  const roles: Array<'heading' | 'body'> = ['heading', 'body'];
  for (let i = 0; i < families.length && i < 2; i += 1) {
    if (signal?.aborted) return names;
    const fam = families[i];
    try {
      // Latin only: a subset font embedded here renders every line as
      // whichever glyph it happens to contain (see `latinOnly`).
      const gathered = await gatherFamilyFiles(
        { name: fam.family, files: fam.files },
        { latinOnly: true },
      );
      const files = gathered.files.filter((f) => !isVariableFont(f.ttfBytes));
      if (files.length === 0) continue;
      const alias = `brand${i}`;
      const regular = pickWeight(files, 'regular');
      const bold = pickWeight(files, 'bold') ?? regular;
      pdf.addFileToVFS(`${alias}-regular.ttf`, bytesToBase64(regular.ttfBytes));
      pdf.addFont(`${alias}-regular.ttf`, alias, 'normal');
      pdf.addFileToVFS(`${alias}-bold.ttf`, bytesToBase64(bold.ttfBytes));
      pdf.addFont(`${alias}-bold.ttf`, alias, 'bold');
      // One family declared: it sets both roles. Two: first heads, second reads.
      if (i === 0) { names.heading = alias; names.body = alias; }
      else names[roles[1]] = alias;
    } catch {
      // A family we could not gather — the next role keeps Helvetica.
    }
  }
  return names;
}

/** The logo, as PNG bytes that read on the given ground. */
async function logoForGround(
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
  const coverGround = palette.brand.primary || brand.colors.core[0]?.hex || '#111113';
  const coverInk = pickFgOnBackground(coverGround, ['#FFFFFF', '#111113']);

  /* ── Cover ──────────────────────────────────────────────────────── */
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

  // A band of the brand's own colours along the foot — the cover says what
  // the document is about before a word of it is read.
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
  pdf.text('BRAND STRATEGY', A4.w / 2, A4.h - MARGIN, { align: 'center', charSpace: 2 });

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
