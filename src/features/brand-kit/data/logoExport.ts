/**
 * The logo payload — one build, every download.
 *
 * `.audit/OURS.md` D28 measured the same word producing two different things:
 * the header ⬇ gave twenty PNGs and no SVG, the card ⬇ gave three SVGs and no
 * PNG, and the Export Kit's `logos/` folder (D29) held the three originals as
 * SVG with nothing else in it. Three surfaces, three answers, one noun. So the
 * bytes are decided ONCE, here, and `addLogosToZip` is the only way anyone
 * gets them.
 *
 * What a variant ships, and why each piece is in the bundle:
 *
 *  • **The source file, verbatim.** A logo is a file the brand owns. Setup
 *    hands the Brand Kit `<svg><rect/><image href="…"/></svg>` so a tile can
 *    paint it on a ground; that wrapper is a PREVIEW and zipping it produces
 *    an `.svg` pointing at a URL the recipient cannot resolve. The href is
 *    pulled out and the referenced bytes ship under their true extension.
 *  • **PNG at 512 / 1024 / 2048.** The three sizes a person actually asks
 *    for — a favicon-ish mark, a slide, a poster — rendered through
 *    `@/shared/brand/rasterizeLogo`, which contains the artwork rather than
 *    cropping it and never taints silently.
 *  • **A PDF.** What a printer asks for. `svg2pdf.js` is NOT a dependency of
 *    this project, so the page is the 2048 raster placed at full bleed rather
 *    than live vector curves. That is stated in the README instead of being
 *    implied by the extension.
 *  • **On transparent AND on every ground the SYSTEM approved for it.** The
 *    grounds are not a colour picker's worth of options: they come from
 *    `logoCombosFor`, the same ordered list the drilldown renders, so a file
 *    in the zip and a tile on the screen can never disagree about which
 *    pairing is allowed (D27 shipped Iris-on-Orange at ~1.5:1 as valid).
 *  • **A README naming the rules.** Clear space, minimum size and the three
 *    misuses were the flat gap in the audit's summary — "no clear-space,
 *    min-size or misuse guidance" — and a folder of pictures cannot say them.
 *
 * Filenames come from the variant's stable id (`primary`, `on-dark`), never
 * from its label: onboarding writes a 400-character description where a name
 * goes, and that description used to become the filename (D57).
 */
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { rasterizeLogo } from '@/shared/brand/rasterizeLogo';
import {
  MIN_PAIRING_CONTRAST,
  brandGrounds,
  contrastRatio,
  extractWrappedImageUrl,
  logoCombosFor,
  logoInkOf,
  stripLogoBackground,
  type BrandGround,
  type LogoLike,
} from './recolorLogo';
import { logoExtension, slugifyName } from './kitExport';
import { throwIfAborted, yieldToBrowser } from './exportScheduler';
import type { ExportSkip } from './zipFile';

/** One file, ready to be written into a zip folder under `path`. */
export type LogoFile = { path: string; blob: Blob };

/** The PNG edges every variant ships on a transparent ground. */
export const LOGO_PNG_SIZES = [512, 1024, 2048] as const;

/** The single edge a ground pairing ships at — three of each would triple the
 *  zip to say the same thing three times. */
export const LOGO_GROUND_PNG_SIZE = 1024;

/** Padding kept around the artwork, as a fraction of the edge. Matches what a
 *  clear-space rule of R = ⅓ implies at the smaller dimension. */
const LOGO_PADDING = 0.08;

/* ─── The plan ────────────────────────────────────────────────────── */

/** One variant, and everything the bundle needs to know about it. */
export type LogoVariantPlan = {
  /** Index into `brand.logos`. */
  index: number;
  /** The name a person reads. */
  label: string;
  /** Filename stem — from the stable id, never the label. */
  base: string;
  /** The colour the artwork is inked in, as well as it can be known. */
  ink: string;
  /** The artwork's own URL: the href out of the wrapper, or a data URL
   *  carrying the inline vector with Setup's preview ground removed. */
  url: string;
  /** The SVG text when the artwork IS an SVG we hold, else null. */
  svg: string | null;
  /** True when `url` points at bytes we must fetch rather than markup. */
  external: boolean;
  /** The grounds this variant is the approved logo for, contrast-checked. */
  grounds: Array<BrandGround & { contrast: number }>;
};

/**
 * A filename stem for a variant.
 *
 * The stable id first (`primary`, `on-dark`) — it is short, it is unique, and
 * it does not change when someone renames the tile. An id that is an opaque
 * code rather than a word (`l1`, `a3`) says nothing in a folder listing, so it
 * falls through to the canonical role and then to the label. The label is cut
 * to four words because that field has held a 400-character paragraph in
 * production, and a path built from one is unusable on Windows before it is
 * ugly (D57).
 */
export function variantBaseName(
  logo: { id?: string; label?: string; role?: string },
  index: number,
): string {
  // NOT `slugifyName`: its "nothing usable survived" answer is the word
  // `brand`, which is right for a zip filename and wrong here — every
  // variant would fall into the same folder and quietly overwrite the last.
  const slug = (v: string) =>
    v.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const fromId = slug(logo.id ?? '');
  // `l1` is a seed's row number, not a name for a file.
  if (fromId.length >= 3 && /[a-z]/.test(fromId) && !/^[a-z]\d+$/.test(fromId)) {
    return fromId;
  }
  // `mono.white` has to keep its two halves apart — slugging alone would
  // silently produce `monowhite`.
  const fromRole = slug((logo.role ?? '').replace(/\./g, '-'));
  if (fromRole && /[a-z]/.test(fromRole)) return fromRole;
  const words = (logo.label ?? '').trim().split(/\s+/).slice(0, 4).join(' ');
  const fromLabel = slug(words);
  if (fromLabel && /[a-z]/.test(fromLabel)) return fromLabel;
  return `logo-${index + 1}`;
}

/** Encode inline SVG markup as a URL an `<img>` can load. */
export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * What the bundle will contain, decided before a single byte is built.
 *
 * Pure, so the README, the unit test and the file walk all read the same
 * decision rather than three copies of it.
 */
export function planLogoExport(brand: MockBrand): LogoVariantPlan[] {
  const logos = brand.logos ?? [];
  if (logos.length === 0) return [];

  const fallbackInk = brand.colors.core[0]?.hex ?? '#111113';
  // Only the PAIRINGS. A treatment tile is the same drawing recoloured, and a
  // recoloured file is not a file the brand owns — the README names the rule
  // instead of the zip shipping artwork nobody approved.
  const pairings = logoCombosFor(brand).filter((t) => t.kind === 'pairing');

  const used = new Set<string>();
  return logos.map((logo, index) => {
    let base = variantBaseName(logo, index);
    let n = 2;
    while (used.has(base)) {
      base = `${variantBaseName(logo, index)}-${n}`;
      n += 1;
    }
    used.add(base);

    const href = extractWrappedImageUrl(logo.svg ?? '');
    const stripped = stripLogoBackground(logo.svg ?? '');
    return {
      index,
      label: logo.label || `Logo ${index + 1}`,
      base,
      ink: logoInkOf(logo as LogoLike, fallbackInk),
      url: href ?? svgToDataUrl(stripped),
      svg: href ? null : stripped,
      external: Boolean(href),
      grounds: pairings
        .filter((t) => t.sourceIndex === index)
        .map((t) => ({ hex: t.bg.hex, name: t.bg.name, contrast: t.contrast })),
    };
  });
}

/* ─── The document ────────────────────────────────────────────────── */

/**
 * The rules, in words, beside the files that obey them.
 *
 * Written from the SAME plan the files come from, so it cannot describe a
 * pairing the folder does not hold. The three misuses are stated as
 * prohibitions rather than illustrated, because a README is read in a text
 * editor and a picture of a stretched logo in Markdown is a picture nobody
 * sees.
 */
export function buildLogosReadme(brand: MockBrand, plan: LogoVariantPlan[]): string {
  const lines: string[] = [`# ${brand.name} — logo`, ''];

  if (plan.length === 0) {
    lines.push(
      'This brand has no logo artwork yet. Add one in Setup → Logo and export again.',
      '',
    );
    return lines.join('\n');
  }

  lines.push('## What is in this folder', '');
  for (const v of plan) {
    lines.push(`### ${v.label} — \`${v.base}/\``, '');
    lines.push(
      `- \`${v.base}.${v.svg ? 'svg' : 'ext'}\` — the source file, exactly as the brand holds it`
        .replace('.ext', '.<original extension>'),
    );
    lines.push(
      `- \`png/\` — ${LOGO_PNG_SIZES.join(' · ')} px on a transparent ground` +
        (v.grounds.length
          ? `, and ${LOGO_GROUND_PNG_SIZE} px on each approved ground`
          : ''),
    );
    lines.push('- `pdf/` — one page per ground, for print');
    if (v.grounds.length === 0) {
      lines.push(
        '- No approved ground: this variant does not clear ' +
          `${MIN_PAIRING_CONTRAST}:1 against any brand colour, so it ships on transparent only.`,
      );
    } else {
      lines.push('', '| Approved ground | Contrast |', '| --- | --- |');
      for (const g of v.grounds) {
        lines.push(`| ${g.name} (${g.hex}) | ${g.contrast.toFixed(1)}:1 |`);
      }
    }
    lines.push('');
  }

  const grounds = brandGrounds(brand);
  const uncovered = grounds.filter(
    (g) => !plan.some((v) => v.grounds.some((pg) => pg.hex === g.hex)),
  );

  lines.push(
    '## Clear space',
    '',
    'Leave **R** clear on every side, where R is one third of the logo’s smaller',
    'dimension. Nothing enters that margin — no type, no rule, no image edge, no',
    'other mark. On a 90 px tall lockup, R is 30 px.',
    '',
    '## Minimum size',
    '',
    'The logo is drawn to read at **24 px** tall and must never be placed smaller.',
    'Use 48 px where it has to survive a screenshot or a low-quality print, and',
    '96 px wherever the logo is the subject rather than a signature.',
    '',
    '## Backgrounds',
    '',
    `A logo may sit on a ground only where it clears **${MIN_PAIRING_CONTRAST}:1**.`,
    'The approved pairings are the ones tabled above; they are also the only ones',
    'the kit exports.',
    '',
  );
  if (uncovered.length > 0) {
    lines.push(
      'These brand grounds have no coloured variant that reads on them — use the',
      'mono cut (black or white artwork) there:',
      '',
      ...uncovered.map((g) => {
        const cut = contrastRatio('#FFFFFF', g.hex) >= contrastRatio('#000000', g.hex)
          ? 'white'
          : 'black';
        return `- ${g.name} (${g.hex}) — use the ${cut} cut`;
      }),
      '',
    );
  }
  lines.push(
    '## Never',
    '',
    '- **Never stretch.** Scale both axes together, always from the source file.',
    `- **Never place the logo on a ground below ${MIN_PAIRING_CONTRAST}:1.** If none of the`,
    '  approved pairings fits, use the mono cut on a neutral.',
    '- **Never recolour.** The approved variants in this folder are the whole set.',
    '',
  );
  return lines.join('\n');
}

/* ─── The bytes ───────────────────────────────────────────────────── */

export type LogoExportDeps = {
  /** Fetch the real bytes behind a variant's URL. */
  fetchBytes?: (url: string) => Promise<Blob | null>;
  /** Contain the artwork on a square canvas; returns a PNG data URL. */
  rasterize?: (
    url: string,
    opts: { size: number; background?: string },
  ) => Promise<string | null>;
  /** Wrap a PNG data URL as a one-page PDF. */
  makePdf?: (png: string, size: number) => Promise<Blob | null>;
  signal?: AbortSignal;
};

/** A `data:` URL's bytes, without a network round trip. */
export function dataUrlToBlob(url: string): Blob | null {
  // Everything up to the FIRST comma is the header, however many `;`
  // parameters it carries. Reading it as `mime(;base64)?` missed
  // `data:image/svg+xml;charset=utf-8,…` — which is the form this module
  // itself writes — and answered null for its own output.
  const match = /^data:([^,]*),(.*)$/s.exec(url);
  if (!match) return null;
  const [, header, payload] = match;
  const base64 = /;base64\s*$/i.test(header);
  const mime = header.split(';')[0].trim();
  try {
    if (base64) {
      const bin = atob(payload);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime || 'application/octet-stream' });
    }
    return new Blob([decodeURIComponent(payload)], {
      type: mime || 'text/plain',
    });
  } catch {
    return null;
  }
}

async function defaultFetchBytes(url: string): Promise<Blob | null> {
  const inline = url.startsWith('data:') ? dataUrlToBlob(url) : null;
  if (inline) return inline;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return blob.size > 0 ? blob : null;
  } catch {
    return null;
  }
}

async function defaultMakePdf(png: string, size: number): Promise<Blob | null> {
  try {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ unit: 'pt', format: [size, size], orientation: 'portrait' });
    // 'FAST' turns on jsPDF's own deflate over the image stream. Without it a
    // PNG is embedded near-uncompressed, which is how a sibling exporter's
    // per-colour `.ai` files reached ~10 MB each.
    pdf.addImage(png, 'PNG', 0, 0, size, size, undefined, 'FAST');
    return pdf.output('blob') as Blob;
  } catch {
    return null;
  }
}

const PDF_PT = 512;

/**
 * How long one render or one fetch may take before the bundle gives up on it.
 *
 * An `<img>` that neither loads nor errors leaves its promise pending for
 * ever — jsdom does it for every url, and a browser does it for a source
 * behind a hung connection. An export that never finishes is worse than one
 * that reports a variant it could not render, so every step is bounded.
 */
export const LOGO_STEP_TIMEOUT_MS = 20000;

function withTimeout<T>(work: Promise<T>, ms = LOGO_STEP_TIMEOUT_MS): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    void work.then(
      (value) => { clearTimeout(timer); resolve(value); },
      () => { clearTimeout(timer); resolve(null); },
    );
  });
}

/** A ground's filename fragment. Falls back to the hex when the name slugs
 *  to nothing (a palette entry called "—" is not hypothetical). */
function groundSlug(ground: BrandGround): string {
  const slug = slugifyName(ground.name ?? '');
  return /[a-z0-9]/.test(slug) ? slug : ground.hex.replace('#', '').toLowerCase();
}

/**
 * Build the whole `logos/` folder.
 *
 * Never throws for one bad variant: a source whose bytes cannot be read is
 * reported through `skipped` and the rest of the bundle still ships. The
 * README is written from the plan, so it is present even when every fetch
 * failed — the rules are the half of a logo system that does not depend on
 * the network.
 */
export async function buildLogoFiles(
  brand: MockBrand,
  deps: LogoExportDeps = {},
): Promise<{ files: LogoFile[]; skipped: ExportSkip[]; plan: LogoVariantPlan[] }> {
  const plan = planLogoExport(brand);
  const files: LogoFile[] = [];
  const skipped: ExportSkip[] = [];
  const fetchBytes = (url: string) =>
    withTimeout((deps.fetchBytes ?? defaultFetchBytes)(url));
  const rasterize = (url: string, opts: { size: number; background?: string }) =>
    withTimeout(
      deps.rasterize
        ? deps.rasterize(url, opts)
        : rasterizeLogo(url, {
            size: opts.size,
            padding: LOGO_PADDING,
            background: opts.background,
          }),
    );
  const makePdf = (png: string, size: number) =>
    withTimeout((deps.makePdf ?? defaultMakePdf)(png, size));

  files.push({
    path: 'README.md',
    blob: new Blob([buildLogosReadme(brand, plan)], {
      type: 'text/markdown;charset=utf-8',
    }),
  });
  if (plan.length === 0) return { files, skipped, plan };

  for (const v of plan) {
    throwIfAborted(deps.signal);

    // 1 — the source file.
    if (v.svg) {
      files.push({
        path: `${v.base}/${v.base}.svg`,
        blob: new Blob([v.svg], { type: 'image/svg+xml;charset=utf-8' }),
      });
    } else {
      const bytes = await fetchBytes(v.url);
      if (bytes) {
        files.push({
          path: `${v.base}/${v.base}.${logoExtension(v.url, bytes.type)}`,
          blob: bytes,
        });
      } else {
        skipped.push({
          label: `Logo — ${v.label}`,
          reason: "the source file couldn't be read from storage",
        });
      }
    }

    // 2 — PNG on transparent, at every size, and one PDF from the largest.
    let largest: string | null = null;
    for (const size of LOGO_PNG_SIZES) {
      throwIfAborted(deps.signal);
      const png = await rasterize(v.url, { size });
      if (!png) continue;
      const blob = dataUrlToBlob(png);
      if (!blob) continue;
      files.push({ path: `${v.base}/png/${v.base}-${size}.png`, blob });
      largest = png;
      await yieldToBrowser(deps.signal);
    }
    if (!largest) {
      skipped.push({
        label: `Logo — ${v.label}`,
        reason: 'the artwork could not be rendered to a bitmap',
      });
    } else {
      const pdf = await makePdf(largest, PDF_PT);
      if (pdf) files.push({ path: `${v.base}/pdf/${v.base}.pdf`, blob: pdf });
    }

    // 3 — the approved pairings, as a PNG and a PDF each.
    for (const ground of v.grounds) {
      throwIfAborted(deps.signal);
      const png = await rasterize(v.url, {
        size: LOGO_GROUND_PNG_SIZE,
        background: ground.hex,
      });
      if (!png) continue;
      const blob = dataUrlToBlob(png);
      const slug = groundSlug(ground);
      if (blob) {
        files.push({ path: `${v.base}/png/${v.base}-on-${slug}.png`, blob });
      }
      const pdf = await makePdf(png, PDF_PT);
      if (pdf) files.push({ path: `${v.base}/pdf/${v.base}-on-${slug}.pdf`, blob: pdf });
      await yieldToBrowser(deps.signal);
    }
  }

  return { files, skipped, plan };
}
