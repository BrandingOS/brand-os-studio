/**
 * The brand book — the document a brand kit exists to produce.
 *
 * `strategy.pdf` says what the brand IS. This says what the brand LOOKS
 * like and how to use it: the mark and its clear space, the palette with
 * the numbers a printer needs, the type as a scale rather than two font
 * names, the voice, the answers, and the brand actually applied to a card,
 * a letterhead, a signature and a social post. Ten A4 pages, vector text,
 * set in the brand's own typeface and painted in the brand's own colours.
 *
 * It is deliberately built on `strategyDocument.ts` rather than beside it.
 * The cover, the font embedding (including the variable-font refusal and
 * the Latin-only subsetting that make it work at all), the hex→rgb bridge
 * and the page geometry are shared, because these are two documents in one
 * family and a second copy of any of that is a second thing to drift.
 *
 * Three rules this file keeps:
 *
 *  • **Vector, not a screenshot.** Every word here is real PDF text — it
 *    selects, searches, prints and survives zoom. The only rasters are the
 *    logo and the application photographs, which genuinely are pictures.
 *  • **Nothing is invented.** Every colour, typeface, word and application
 *    comes off the brand. A section with nothing behind it is omitted, not
 *    filled with a placeholder — a brand book that lies about what a brand
 *    has is worse than a shorter one.
 *  • **A family that cannot render must not cost the whole document.**
 *    The applications are rendered by the same renderers the kit exports,
 *    and one of them being mid-conversion is a normal state of this repo.
 *    Anything that fails comes back in `skipped` and its page is left out.
 */
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';
import { buildBrandPalette, pickSurfaceTokens, type BrandPalette } from '@/shared/brand/brandPalette';
import { contrastRatio, pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import type { DeliverableKey } from '../kit/types';
import {
  A4,
  MARGIN,
  embedBrandFonts,
  logoForGround,
  paintCover,
  rgb,
  type BrandFontNames,
  type Ink,
} from './strategyDocument';

/* ─── Applications ────────────────────────────────────────────────── */

/** One rendered application, ready to place on the gallery page. */
export type ApplicationShot = {
  /** The caption under the picture. The entry's own label. */
  label: string;
  /** PNG data URL. */
  dataUrl: string;
  /** width / height, measured from the raster. */
  aspect: number;
};

/** Why an application is not in the book. Shown to the user, not swallowed. */
export type BrandBookSkip = { label: string; reason: string };

/**
 * The four applications the book shows, in the order it shows them.
 *
 * Catalog KEYS, not labels: `key` is storage identity and never changes,
 * while a label is free to. Email Signature keeps its historical `web::`
 * key even though it now lives in Brand Applications, which is exactly the
 * kind of drift a key-addressed list is immune to.
 */
export const BRAND_BOOK_APPLICATIONS: ReadonlyArray<DeliverableKey> = [
  'stationery::Business Card',
  'stationery::Letterhead',
  'web::Email Signature',
  'social::Social Media System',
] as DeliverableKey[];

/** Read a blob as a data URL. */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

/** The raster's own shape. A picture placed at a guessed aspect is a squashed picture. */
function measureAspect(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1);
    img.onerror = () => resolve(1);
    img.src = dataUrl;
  });
}

/**
 * Render the applications through the kit's own exporter.
 *
 * `buildKitZipBlob` is imported dynamically for two reasons, and both
 * matter: it drags in every renderer in the product (so a static import
 * would put the whole template library in this module's dependency graph),
 * and the integration wave will have `exportEverything` call US — a static
 * edge in both directions is a cycle.
 */
export async function collectApplicationShots(
  brand: MockBrand,
  sourceBrand: Brand | undefined,
  signal?: AbortSignal,
): Promise<{ shots: ApplicationShot[]; skipped: BrandBookSkip[] }> {
  if (!sourceBrand) {
    return { shots: [], skipped: [{ label: 'Applications', reason: 'the book needs a saved brand to render them' }] };
  }
  try {
    const [{ getEntry }, { buildKitZipBlob, planKitExport }, { default: JSZip }] = await Promise.all([
      import('../catalog/catalog'),
      import('./exportEverything'),
      import('jszip'),
    ]);
    const entries = BRAND_BOOK_APPLICATIONS.map((key) => getEntry(key)).filter(
      (e): e is NonNullable<typeof e> => Boolean(e),
    );
    if (entries.length === 0) return { shots: [], skipped: [] };

    const result = await buildKitZipBlob({ brand, sourceBrand, entries, signal });
    const zip = await JSZip.loadAsync(result.blob);
    const skipped: BrandBookSkip[] = result.skipped.map((s) => ({ label: s.label, reason: s.reason }));
    const shots: ApplicationShot[] = [];
    // The plan is what says where each entry's file landed, so the gallery
    // is in the catalog's order rather than the zip's.
    for (const unit of planKitExport(entries)) {
      const file = zip.file(unit.path);
      if (!file) continue;
      const dataUrl = await blobToDataUrl(await file.async('blob'));
      shots.push({ label: unit.label, dataUrl, aspect: await measureAspect(dataUrl) });
    }
    return { shots, skipped };
  } catch (err) {
    if ((err as { name?: string })?.name === 'ExportCancelled') throw err;
    return {
      shots: [],
      skipped: [
        {
          label: 'Applications',
          reason: err instanceof Error ? err.message : 'the deliverables could not be rendered',
        },
      ],
    };
  }
}

/* ─── Colour maths a print shop asks for ──────────────────────────── */

/** Naive but honest RGB→CMYK, which is what a hex value can actually say. */
export function hexToCmyk(hex: string): [number, number, number, number] {
  const [r, g, b] = rgb(hex).map((v) => v / 255);
  const k = 1 - Math.max(r, g, b);
  if (k >= 1) return [0, 0, 0, 100];
  const f = (v: number) => Math.round((((1 - v - k) / (1 - k)) || 0) * 100);
  return [f(r), f(g), f(b), Math.round(k * 100)];
}

/**
 * How much of each colour a layout should be.
 *
 * A palette listed as equal squares tells a designer nothing about which
 * colour the brand IS. The weights fall away steeply because that is what
 * a brand's own proportions look like — one dominant colour, one support,
 * the rest as accents — and they are normalised, so the bar is always full
 * whether the brand has two colours or eight.
 */
export function proportionWeights(count: number): number[] {
  if (count <= 0) return [];
  const raw = Array.from({ length: count }, (_, i) => 1 / Math.pow(1.9, i));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / total);
}

/* ─── The document ────────────────────────────────────────────────── */

export type BrandBookOptions = {
  signal?: AbortSignal;
  /**
   * Pre-rendered applications.
   *
   * Supplied, they are used as-is; omitted, they are rendered here. An
   * empty array means "no gallery" and is how a caller (or a test) asks
   * for the book without paying for four offscreen rasterizations.
   */
  applications?: ApplicationShot[];
};

export type BrandBookResult = {
  blob: Blob;
  /** Section titles in document order, with the page each starts on. */
  contents: Array<{ title: string; page: number }>;
  /** Anything the book could not include. */
  skipped: BrandBookSkip[];
};

const KICKER = 'BRAND BOOK';

/**
 * Build the brand book.
 *
 * Returns the contents as data too, because the caller (a toast, a test,
 * the export manifest) should be able to say what is in the document
 * without re-parsing the PDF.
 */
export async function buildBrandBook(
  brand: MockBrand,
  sourceBrand?: Brand,
  opts: BrandBookOptions = {},
): Promise<BrandBookResult> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const fonts = await embedBrandFonts(pdf, brand, opts.signal);

  const palette = buildBrandPalette(sourceBrand, 'light');
  const surface = pickSurfaceTokens(palette, 'page');
  const ink: Ink = {
    heading: surface.text,
    body: surface.text,
    muted: surface.textMuted,
    rule: surface.border,
  };
  const primary = palette.brand.primary || brand.colors.core[0]?.hex || '#111113';
  const width = A4.w - MARGIN * 2;

  const skipped: BrandBookSkip[] = [];
  let applications = opts.applications;
  if (!applications) {
    const collected = await collectApplicationShots(brand, sourceBrand, opts.signal);
    applications = collected.shots;
    skipped.push(...collected.skipped);
  }

  /* ── Page primitives ──────────────────────────────────────────── */

  const contents: Array<{ title: string; page: number }> = [];
  let y = MARGIN;

  /** Start a page and record it in the contents. */
  const openSection = (title: string) => {
    pdf.addPage();
    contents.push({ title, page: pdf.getNumberOfPages() });
    y = MARGIN + 8;
    pdf.setFont(fonts.body, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...rgb(primary));
    pdf.text(KICKER, MARGIN, y, { charSpace: 2 });
    y += 26;
    pdf.setFont(fonts.heading, 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...rgb(ink.heading));
    pdf.text(title, MARGIN, y);
    y += 14;
    pdf.setDrawColor(...rgb(ink.rule));
    pdf.setLineWidth(0.7);
    pdf.line(MARGIN, y, MARGIN + width, y);
    y += 28;
  };

  /** A small uppercase label above a block. The only uppercase in the book. */
  const eyebrow = (text: string) => {
    pdf.setFont(fonts.body, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...rgb(ink.muted));
    pdf.text(text.toUpperCase(), MARGIN, y, { charSpace: 1.2 });
    y += 16;
  };

  /** Body copy, measured in the font it is drawn in. */
  const para = (text: string, size = 11, color = ink.body, maxWidth = width) => {
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(text, maxWidth) as string[];
    pdf.setTextColor(...rgb(color));
    pdf.text(lines, MARGIN, y, { lineHeightFactor: 1.4 });
    y += lines.length * size * 1.4 + 6;
  };

  /* ── 1 · Cover ────────────────────────────────────────────────── */
  await paintCover(pdf, { brand, sourceBrand, fonts, palette, kicker: KICKER });

  /* ── 2 · Contents (painted last, once the page numbers are known) ─ */
  pdf.addPage();
  const contentsPage = pdf.getNumberOfPages();

  /* ── 3 · The brand in one line ────────────────────────────────── */
  //
  // Whatever this page SAYS is not said again on the Strategy page. The
  // first book measured on Raqm printed the mission twice — once as the
  // statement and once four pages later under MISSION — because the two
  // sections each decided independently what they were about.
  const spokenHere = new Set<string>(['summary', 'tone', 'personality', 'values']);
  {
    openSection('The brand');
    const summary = brand.strategy?.summary?.trim();
    const mission = brand.strategy?.mission?.trim();
    const lead = summary || mission || brand.strategy?.positioning?.trim() || '';
    if (!summary && mission) spokenHere.add('mission');
    else if (!summary && !mission && lead) spokenHere.add('positioning');
    if (lead) {
      // Set large and short — this is the one page someone reads aloud.
      pdf.setFont(fonts.heading, 'bold');
      pdf.setFontSize(22);
      pdf.setTextColor(...rgb(ink.heading));
      const lines = pdf.splitTextToSize(lead, width) as string[];
      pdf.text(lines, MARGIN, y + 10, { lineHeightFactor: 1.32 });
      y += lines.length * 29 + 34;
    } else {
      para('This brand has not written its summary yet. Setup → Brand Strategy.', 11, ink.muted);
    }
    if (summary && mission) {
      eyebrow('Mission');
      para(mission);
      spokenHere.add('mission');
    }
    const slogan = brand.strategy?.slogan?.trim();
    if (slogan) spokenHere.add('slogan');
    if (slogan) {
      y += 8;
      pdf.setFillColor(...rgb(primary));
      pdf.rect(MARGIN, y, width, 64, 'F');
      pdf.setFont(fonts.heading, 'bold');
      pdf.setFontSize(15);
      pdf.setTextColor(...rgb(pickFgOnBackground(primary, ['#FFFFFF', '#111113'])));
      pdf.text(slogan, MARGIN + 20, y + 38, { maxWidth: width - 40 });
      y += 88;
    }
  }

  /* ── 4 · The logo ─────────────────────────────────────────────── */
  {
    openSection('The logo');
    const groundOptions = [
      { hex: surface.bg, name: 'On light' },
      { hex: primary, name: 'On brand' },
      { hex: pickSurfaceTokens(palette, 'inverted').bg, name: 'On dark' },
    ];
    const tileW = (width - 16 * 2) / 3;
    const tileH = 108;
    const top = y;
    let placedAny = false;
    for (let i = 0; i < groundOptions.length; i += 1) {
      const { hex, name } = groundOptions[i];
      const x = MARGIN + i * (tileW + 16);
      pdf.setFillColor(...rgb(hex));
      pdf.setDrawColor(...rgb(ink.rule));
      pdf.setLineWidth(0.5);
      pdf.rect(x, top, tileW, tileH, 'FD');
      const art = await logoForGround(sourceBrand, hex);
      if (art) {
        const box = Math.min(tileW - 44, tileH - 34);
        try {
          pdf.addImage(art, 'PNG', x + (tileW - box) / 2, top + (tileH - box) / 2, box, box, undefined, 'FAST');
          placedAny = true;
        } catch {
          // Undecodable art: the tile still shows the ground and its name.
        }
      }
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...rgb(ink.muted));
      pdf.text(name, x, top + tileH + 14);
    }
    y = top + tileH + 36;
    if (!placedAny) {
      skipped.push({ label: 'Logo', reason: 'this brand has no logo artwork yet' });
    }

    // Clear space. R is the formula every guideline states and almost none
    // draw; drawn, nobody has to guess what the R refers to.
    eyebrow('Clear space');
    para(
      'Keep clear space equal to R on every side, where R is one third of the mark’s height. Nothing — type, image, edge of the page — enters that field.',
      10,
      ink.body,
      width * 0.62,
    );
    const dY = y + 4;
    const outerH = 118;
    const outerW = 210;
    const R = outerH / 3 / 2 + 12;
    pdf.setDrawColor(...rgb(ink.rule));
    pdf.setLineWidth(0.7);
    pdf.setLineDashPattern([3, 3], 0);
    pdf.rect(MARGIN, dY, outerW, outerH, 'S');
    pdf.setLineDashPattern([], 0);
    const innerW = outerW - R * 2;
    const innerH = outerH - R * 2;
    // The inner field is the rule made VISIBLE. Without it the diagram was
    // a dashed box with a logo loose inside it and an R measured against
    // nothing — the reader had to take the caption's word for what R was.
    pdf.setDrawColor(...rgb(ink.rule));
    pdf.setLineWidth(0.5);
    pdf.rect(MARGIN + R, dY + R, innerW, innerH, 'S');
    const mark = await logoForGround(sourceBrand, surface.bg);
    if (mark) {
      const box = Math.min(innerW, innerH);
      try {
        pdf.addImage(mark, 'PNG', MARGIN + (outerW - box) / 2, dY + (outerH - box) / 2, box, box, undefined, 'FAST');
      } catch {
        // The dashed field alone still states the rule.
      }
    }
    pdf.setDrawColor(...rgb(primary));
    pdf.setLineWidth(0.8);
    pdf.line(MARGIN + outerW / 2, dY, MARGIN + outerW / 2, dY + R);
    pdf.setFont(fonts.body, 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...rgb(primary));
    pdf.text('R', MARGIN + outerW / 2 + 5, dY + R - 4);

    // Minimum size, stated in both the units it gets used in.
    const minX = MARGIN + outerW + 46;
    if (mark) {
      try {
        pdf.addImage(mark, 'PNG', minX, dY + 18, 52, 52, undefined, 'FAST');
      } catch {
        /* noop */
      }
    }
    pdf.setFont(fonts.body, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...rgb(ink.muted));
    pdf.text('MINIMUM SIZE', minX, dY + 88, { charSpace: 1.2 });
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...rgb(ink.body));
    pdf.text('24 px on screen · 10 mm in print', minX, dY + 104);
    y = dY + outerH + 34;

    // Misuse. This is the half of a logo page that decides whether the
    // rules above are followed, and it is the half that gets left out —
    // a reader who has only seen the mark used correctly has no example
    // of the thing they are about to do. Every tile is the brand's OWN
    // mark, abused: a drawing of a generic logo being stretched teaches
    // nobody what stretching THIS one looks like.
    if (mark) {
      eyebrow('Never');
      const COLS = 4;
      const mGap = 14;
      const mW = (width - mGap * (COLS - 1)) / COLS;
      const mH = 86;
      const misuse: Array<[string, (x: number, top: number) => void]> = [
        [
          'Stretch or squash it',
          (x, top) => {
            pdf.addImage(mark, 'PNG', x + 8, top + 22, mW - 16, mH - 52, undefined, 'FAST');
          },
        ],
        [
          'Rotate or tilt it',
          (x, top) => {
            const box = mH - 34;
            pdf.addImage(mark, 'PNG', x + (mW - box) / 2, top + 17, box, box, undefined, 'FAST', 12);
          },
        ],
        [
          'Retype the name instead of using it',
          (x, top) => {
            // Vector, and deliberately NOT one of the brand's own faces:
            // the misuse is setting the name as type at all.
            pdf.setFont('times', 'italic');
            pdf.setFontSize(15);
            pdf.setTextColor(...rgb(ink.body));
            pdf.text(brand.name, x + mW / 2, top + mH / 2 + 5, {
              align: 'center',
              maxWidth: mW - 12,
            });
          },
        ],
        [
          'Crowd it',
          (x, top) => {
            // Blocks BUTTED against the mark, not drawn through it. A rule
            // across the middle read as a logo struck out, which is a
            // different rule and one nobody was making.
            const box = mH - 34;
            const left = x + (mW - box) / 2;
            pdf.setFillColor(...rgb(ink.rule));
            pdf.rect(x + 4, top + 4, left - x - 4, mH - 8, 'F');
            pdf.rect(left + box, top + 4, x + mW - 4 - (left + box), mH - 8, 'F');
            pdf.addImage(mark, 'PNG', left, top + 17, box, box, undefined, 'FAST');
          },
        ],
      ];
      misuse.forEach(([caption, draw], i) => {
        const x = MARGIN + i * (mW + mGap);
        pdf.setDrawColor(...rgb(ink.rule));
        pdf.setLineWidth(0.5);
        pdf.rect(x, y, mW, mH, 'S');
        try {
          draw(x, y);
        } catch {
          // A tile that will not draw still states its rule in the caption.
        }
        pdf.setFont(fonts.body, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...rgb(ink.muted));
        pdf.text(pdf.splitTextToSize(caption, mW) as string[], x, y + mH + 12);
      });
      y += mH + 40;
    }
  }

  /* ── 5 · Colour ───────────────────────────────────────────────── */
  const swatches = [
    ...(brand.colors.core ?? []).map((c) => ({ ...c, role: 'Core' })),
    ...(brand.colors.accent ?? []).map((c) => ({ ...c, role: 'Accent' })),
  ].filter((c) => c.hex);
  {
    openSection('Colour');
    if (swatches.length === 0) {
      para('This brand has no colours yet. Setup → Colors.', 11, ink.muted);
    } else {
      const shown = swatches.slice(0, 9);
      const COLS = 3;
      const gap = 16;
      const cell = (width - gap * (COLS - 1)) / COLS;
      const chip = 58;
      let rowTop = y;
      for (let i = 0; i < shown.length; i += 1) {
        const col = i % COLS;
        const x = MARGIN + col * (cell + gap);
        pdf.setFillColor(...rgb(shown[i].hex));
        pdf.setDrawColor(...rgb(ink.rule));
        pdf.setLineWidth(0.5);
        pdf.roundedRect(x, rowTop, cell, chip, 4, 4, 'FD');
        pdf.setFont(fonts.body, 'bold');
        pdf.setFontSize(9.5);
        pdf.setTextColor(...rgb(ink.heading));
        pdf.text(shown[i].name || shown[i].hex, x, rowTop + chip + 14, { maxWidth: cell });
        const [r, g, b] = rgb(shown[i].hex);
        const [c, m, yy, k] = hexToCmyk(shown[i].hex);
        pdf.setFont(fonts.body, 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...rgb(ink.muted));
        pdf.text(shown[i].hex.toUpperCase(), x, rowTop + chip + 25);
        pdf.text(`RGB ${r} ${g} ${b}`, x, rowTop + chip + 34);
        pdf.text(`CMYK ${c} ${m} ${yy} ${k}`, x, rowTop + chip + 43);
        if (col === COLS - 1 || i === shown.length - 1) rowTop += chip + 60;
      }
      y = rowTop + 4;

      // Proportion.
      eyebrow('Proportion');
      const bar = swatches.slice(0, 6);
      const weights = proportionWeights(bar.length);
      let x = MARGIN;
      bar.forEach((sw, i) => {
        const w = width * weights[i];
        pdf.setFillColor(...rgb(sw.hex));
        // Hairline on EVERY segment, not only the pale ones: SKAM's white
        // segment painted white on a white page read as a hole in the bar,
        // and a rule that only appears sometimes is a rule that looks like
        // a bug the one time it does.
        pdf.setDrawColor(...rgb(ink.rule));
        pdf.setLineWidth(0.4);
        pdf.rect(x, y, w, 26, 'FD');
        const pct = Math.round(weights[i] * 100);
        if (w > 26) {
          pdf.setFont(fonts.body, 'bold');
          pdf.setFontSize(7.5);
          pdf.setTextColor(...rgb(pickFgOnBackground(sw.hex, ['#FFFFFF', '#111113'])));
          pdf.text(`${pct}%`, x + 5, y + 17);
        }
        x += w;
      });
      y += 46;

      // Contrast matrix — the ratio of every colour against every other,
      // so "which of ours can sit on which of ours" is answered on paper.
      eyebrow('Contrast');
      const grid = swatches.slice(0, 6);
      const head = 74;
      const colW = (width - head) / grid.length;
      const rowH = 22;
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(...rgb(ink.muted));
      grid.forEach((sw, i) => {
        pdf.text((sw.name || sw.hex).slice(0, 11), head + MARGIN + i * colW + 3, y - 4);
      });
      grid.forEach((row, ri) => {
        const top = y + ri * rowH;
        pdf.setFont(fonts.body, 'normal');
        pdf.setFontSize(7.5);
        pdf.setTextColor(...rgb(ink.body));
        pdf.text((row.name || row.hex).slice(0, 13), MARGIN, top + 14, { maxWidth: head - 6 });
        grid.forEach((colSw, ci) => {
          const x2 = MARGIN + head + ci * colW;
          const ratio = contrastRatio(row.hex, colSw.hex);
          const pass = ratio >= 4.5;
          pdf.setFillColor(...rgb(colSw.hex));
          // Same reason as the proportion bar: a white cell on a white page
          // left its figure floating with no cell around it.
          pdf.setDrawColor(...rgb(ink.rule));
          pdf.setLineWidth(0.4);
          pdf.rect(x2, top, colW - 3, rowH - 3, 'FD');
          pdf.setFont(fonts.body, pass ? 'bold' : 'normal');
          pdf.setFontSize(7.5);
          pdf.setTextColor(...rgb(pickFgOnBackground(colSw.hex, ['#FFFFFF', '#111113'])));
          // A colour on itself is 1.0 in every cell of the diagonal. Six
          // meaningless figures down the middle of a table read as data.
          pdf.text(ri === ci ? '—' : ratio >= 20 ? '21' : ratio.toFixed(1), x2 + 4, top + 13);
        });
      });
      y += grid.length * rowH + 14;
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...rgb(ink.muted));
      pdf.text('Bold figures clear WCAG AA (4.5:1) for body text.', MARGIN, y);
      y += 20;
    }
  }

  /* ── 6 · Typography ───────────────────────────────────────────── */
  {
    openSection('Typography');
    const families = brand.fonts ?? [];
    if (families.length === 0) {
      para('This brand has no typefaces yet. Setup → Typography.', 11, ink.muted);
    } else {
      families.slice(0, 2).forEach((fam, i) => {
        const face = i === 0 ? fonts.heading : fonts.body;
        eyebrow(i === 0 ? 'Headings' : 'Body');
        pdf.setFont(face, 'bold');
        pdf.setFontSize(30);
        pdf.setTextColor(...rgb(ink.heading));
        pdf.text('Aa Bb Cc Dd Ee', MARGIN, y + 12);
        y += 40;
        pdf.setFont(face, 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(...rgb(ink.muted));
        // A caption naming a typeface the specimen is not set in is the one
        // lie a brand book must not tell. `embedded` is what actually got
        // into the file; anything else says so, in the caption, right here.
        const real = fonts.embedded.includes(fam.family);
        pdf.text(
          real
            ? `${fam.family} — ${fam.weights || 'Regular'}`
            : `${fam.family} — ${fam.weights || 'Regular'} · shown in a substitute; this face could not be embedded`,
          MARGIN,
          y,
          { maxWidth: width },
        );
        y += 12;
        pdf.setFontSize(9);
        pdf.text('ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789', MARGIN, y, {
          maxWidth: width,
        });
        y += 30;
      });

      // The scale — a pairing is two names; a scale is a system.
      eyebrow('Scale');
      const scale: Array<[string, number, 'heading' | 'body', 'bold' | 'normal']> = [
        ['Display', 34, 'heading', 'bold'],
        ['Heading 1', 24, 'heading', 'bold'],
        ['Heading 2', 18, 'heading', 'bold'],
        ['Body', 11, 'body', 'normal'],
        ['Caption', 9, 'body', 'normal'],
      ];
      for (const [name, size, role, weight] of scale) {
        pdf.setFont(fonts.body, 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(...rgb(ink.muted));
        pdf.text(`${name} · ${size}pt`, MARGIN, y + size * 0.75);
        pdf.setFont(role === 'heading' ? fonts.heading : fonts.body, weight);
        pdf.setFontSize(size);
        pdf.setTextColor(...rgb(ink.heading));
        pdf.text('The quick brown fox', MARGIN + 110, y + size * 0.78, { maxWidth: width - 110 });
        y += size * 1.35 + 12;
      }
    }
  }

  /* ── 7 · Voice & tone ─────────────────────────────────────────── */
  {
    openSection('Voice & tone');
    const rows: Array<[string, string]> = [];
    for (const key of ['tone', 'personality', 'values'] as const) {
      const card = STRATEGY_CARDS.find((c) => c.key === key);
      const value = card && brand.strategy ? contentOf(card, brand.strategy) : '';
      if (value) rows.push([card!.name, value]);
    }
    if (rows.length === 0 && !brand.voice?.essay?.trim()) {
      para('This brand has not described its voice yet.', 11, ink.muted);
    }
    for (const [label, value] of rows) {
      eyebrow(label);
      para(value, 13);
      y += 4;
    }
    // A brand whose `voice.essay` IS its tone answer printed the same
    // sentence twice on one page, under TONE and again under HOW IT
    // SOUNDS — measured on Raqm. Two labels over one sentence reads as a
    // template that was filled in by machine, which is exactly what it was.
    const essay = brand.voice?.essay?.trim() ?? '';
    const said = (text: string) => text.toLowerCase().replace(/[\s.,;:—–-]+/g, ' ').trim();
    const alreadySaid = rows.some(([, value]) => said(value) === said(essay));
    if (essay && !alreadySaid) {
      eyebrow('How it sounds');
      para(essay, 11);
    }
    const pillars = (brand.voice?.pillars ?? []).filter((p) => p.trim());
    if (pillars.length > 0) {
      y += 6;
      eyebrow('Pillars');
      for (const pillar of pillars) {
        pdf.setFillColor(...rgb(primary));
        pdf.circle(MARGIN + 3, y - 3, 2.4, 'F');
        pdf.setFont(fonts.body, 'normal');
        pdf.setFontSize(11);
        pdf.setTextColor(...rgb(ink.body));
        pdf.text(pillar, MARGIN + 14, y, { maxWidth: width - 14 });
        y += 20;
      }
    }
  }

  /* ── 8 · Strategy ─────────────────────────────────────────────── */
  {
    openSection('Strategy');
    // Everything already spoken for elsewhere in the book — by the voice
    // page, or by whatever the statement page chose to be.
    let printed = 0;
    for (const card of STRATEGY_CARDS) {
      if (spokenHere.has(card.key)) continue;
      const value = brand.strategy ? contentOf(card, brand.strategy) : '';
      if (!value) continue;
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(value, width) as string[];
      if (y + 22 + lines.length * 15 > A4.h - MARGIN) {
        pdf.addPage();
        y = MARGIN + 10;
      }
      pdf.setFont(fonts.body, 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...rgb(primary));
      pdf.text(card.name.toUpperCase(), MARGIN, y, { charSpace: 1.2 });
      y += 15;
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...rgb(ink.body));
      pdf.text(lines, MARGIN, y, { lineHeightFactor: 1.35 });
      y += lines.length * 15 + 16;
      printed += 1;
    }
    const notes = (brand.about ?? []).filter((s) => (s.content ?? '').trim());
    for (const note of notes) {
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(note.content.trim(), width) as string[];
      if (y + 22 + lines.length * 15 > A4.h - MARGIN) {
        pdf.addPage();
        y = MARGIN + 10;
      }
      pdf.setFont(fonts.body, 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(...rgb(primary));
      pdf.text(note.title.toUpperCase(), MARGIN, y, { charSpace: 1.2 });
      y += 15;
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(...rgb(ink.body));
      pdf.text(lines, MARGIN, y, { lineHeightFactor: 1.35 });
      y += lines.length * 15 + 16;
      printed += 1;
    }
    if (printed === 0) {
      para('Not yet answered — fill this in at Setup → Brand Strategy.', 11, ink.muted);
    }
  }

  /* ── 9 · Applications ─────────────────────────────────────────── */
  //
  // Two rules, and the first one cost a squashed letterhead to learn:
  //
  //  • **Never distort.** The first version drew every shot at the cell's
  //    full width and a height capped at 230pt, and `addImage` obeys the
  //    width and height it is given — so a portrait letterhead came out
  //    laid out as a landscape one. A picture is FITTED inside its cell and
  //    centred in it; the cell is what is fixed, never the picture.
  //  • **A row shares a baseline.** Captions set directly under pictures of
  //    different heights sit at different heights, and a gallery whose
  //    labels wander reads as a broken grid. The row is measured first, and
  //    every caption in it sits on the row's own foot.
  if (applications.length > 0) {
    openSection('In use');
    para('The brand applied. Every one of these is generated from the values in this book.', 10, ink.muted);
    y += 6;
    const gap = 18;
    const cellW = (width - gap) / 2;
    const CELL_H = 240;
    const shots = applications.slice(0, 6);
    for (let i = 0; i < shots.length; i += 2) {
      const row = shots.slice(i, i + 2);
      // The row is as tall as the tallest picture in it, never taller than
      // the cell — so two landscape shots do not leave a band of nothing.
      const rowH = Math.max(
        ...row.map((shot) => Math.min(CELL_H, cellW / Math.max(0.2, shot.aspect))),
      );
      if (y + rowH + 30 > A4.h - MARGIN) {
        pdf.addPage();
        y = MARGIN + 10;
      }
      row.forEach((shot, col) => {
        const aspect = Math.max(0.2, shot.aspect);
        let drawH = Math.min(rowH, cellW / aspect);
        let drawW = drawH * aspect;
        if (drawW > cellW) {
          drawW = cellW;
          drawH = drawW / aspect;
        }
        const x = MARGIN + col * (cellW + gap) + (cellW - drawW) / 2;
        // Bottom-aligned, so every caption sits directly under its own
        // picture. Centring left a short shot floating with a gap above it
        // AND a gap below it — twice as much stray white as either choice.
        const top = y + (rowH - drawH);
        try {
          pdf.addImage(shot.dataUrl, 'PNG', x, top, drawW, drawH, undefined, 'FAST');
        } catch {
          skipped.push({ label: shot.label, reason: 'the render could not be placed in the PDF' });
        }
        pdf.setDrawColor(...rgb(ink.rule));
        pdf.setLineWidth(0.5);
        pdf.rect(x, top, drawW, drawH, 'S');
        pdf.setFont(fonts.body, 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...rgb(ink.muted));
        pdf.text(shot.label, MARGIN + col * (cellW + gap), y + rowH + 14);
      });
      y += rowH + 34;
    }
  }

  /* ── 10 · Back page ───────────────────────────────────────────── */
  {
    pdf.addPage();
    const backPage = pdf.getNumberOfPages();
    contents.push({ title: 'Contact', page: backPage });
    const ground = pickSurfaceTokens(palette, 'inverted').bg;
    const fg = pickFgOnBackground(ground, ['#FFFFFF', '#111113']);
    pdf.setFillColor(...rgb(ground));
    pdf.rect(0, 0, A4.w, A4.h, 'F');
    const art = await logoForGround(sourceBrand, ground);
    if (art) {
      try {
        pdf.addImage(art, 'PNG', MARGIN, MARGIN, 96, 96, undefined, 'FAST');
      } catch {
        /* the name below still lands */
      }
    }
    let by = A4.h - MARGIN - 120;
    pdf.setTextColor(...rgb(fg));
    pdf.setFont(fonts.heading, 'bold');
    pdf.setFontSize(20);
    pdf.text(brand.name, MARGIN, by);
    by += 26;
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(11);
    const site = (brand.websites ?? []).find((w) => w.url)?.url;
    if (site) {
      pdf.text(site, MARGIN, by);
      by += 18;
    }
    const links = (brand.links ?? []).filter((l) => l.url).slice(0, 4);
    if (links.length > 0) {
      pdf.setFontSize(9.5);
      pdf.text(links.map((l) => l.label || l.url).join('  ·  '), MARGIN, by, { maxWidth: width });
      by += 18;
    }
    // A brand book with no date cannot be told from the one it replaced.
    pdf.setFontSize(8.5);
    pdf.text(`Exported ${new Date().toISOString().slice(0, 10)}`, MARGIN, by);
    pdf.setFontSize(8);
    pdf.text(KICKER, MARGIN, A4.h - MARGIN, { charSpace: 2 });
  }

  /* ── Contents, now that the numbers exist ─────────────────────── */
  {
    pdf.setPage(contentsPage);
    let cy = MARGIN + 8;
    pdf.setFont(fonts.body, 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(...rgb(primary));
    pdf.text(KICKER, MARGIN, cy, { charSpace: 2 });
    cy += 26;
    pdf.setFont(fonts.heading, 'bold');
    pdf.setFontSize(26);
    pdf.setTextColor(...rgb(ink.heading));
    pdf.text('Contents', MARGIN, cy);
    cy += 14;
    pdf.setDrawColor(...rgb(ink.rule));
    pdf.setLineWidth(0.7);
    pdf.line(MARGIN, cy, MARGIN + width, cy);
    cy += 32;
    for (const item of contents) {
      pdf.setFont(fonts.body, 'normal');
      pdf.setFontSize(12);
      pdf.setTextColor(...rgb(ink.body));
      pdf.text(item.title, MARGIN, cy);
      pdf.setTextColor(...rgb(ink.muted));
      // Page numbers are printed 1-based from the page AFTER the cover, so
      // the number in the contents is the number on the page's own foot.
      pdf.text(String(item.page - 1), MARGIN + width, cy, { align: 'right' });
      pdf.setDrawColor(...rgb(ink.rule));
      pdf.setLineWidth(0.4);
      pdf.line(MARGIN, cy + 8, MARGIN + width, cy + 8);
      cy += 26;
    }
  }

  /* ── Running foot ─────────────────────────────────────────────── */
  const total = pdf.getNumberOfPages();
  for (let i = 2; i <= total; i += 1) {
    pdf.setPage(i);
    // The back page is a full-bleed dark field and prints its own foot.
    if (i === total) continue;
    pdf.setFont(fonts.body, 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...rgb(ink.muted));
    pdf.text(`${brand.name} · Brand book`, MARGIN, A4.h - 30);
    pdf.text(String(i - 1), A4.w - MARGIN, A4.h - 30, { align: 'right' });
  }

  return { blob: pdf.output('blob') as Blob, contents, skipped };
}

/** The book as a blob, for callers that only want the file. */
export async function buildBrandBookPdf(
  brand: MockBrand,
  sourceBrand?: Brand,
  opts: BrandBookOptions = {},
): Promise<Blob> {
  return (await buildBrandBook(brand, sourceBrand, opts)).blob;
}
