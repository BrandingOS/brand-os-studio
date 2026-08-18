/**
 * Bulk Brand Kit ZIP exporter.
 *
 * Walks every brand asset (logos · colors · typography · favicons · brand
 * guide PDF) and packages them into a single organized ZIP using `jszip`
 * (already in deps via the export engine).
 *
 * Self-contained — only imports the public export engine, the brand
 * engines, and these v2 utilities. No off-limits paths touched.
 */
import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import { generateLogoVariants } from '@/shared/color/brandRules';
import { generateBrandGuidePdf } from './brandGuidePdf';
import { generateFavicons, generateIcoFromFavicons } from './favicon';
import { hexToCmyk, formatCmyk, formatRgb } from './cmykApprox';
import { rasterizeLogoVariant, fetchSvgIfPossible } from './downloaders';

export interface BulkExportProgress {
  pct: number;
  label: string;
}

type ProgressFn = (p: BulkExportProgress) => void;

function safeName(s: string): string {
  return (s || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}


/** Helper: collect all swatches from brand top-level + extended palette. */
function collectSwatches(brand: Brand): Array<{ name: string; hex: string }> {
  const out: Array<{ name: string; hex: string }> = [];
  if (brand.primaryColor) out.push({ name: 'Primary', hex: brand.primaryColor });
  if (brand.secondaryColor) out.push({ name: 'Secondary', hex: brand.secondaryColor });
  const palette = brand.guidelines?.colorPalette;
  if (palette?.accent?.hex) out.push({ name: 'Accent', hex: palette.accent.hex });
  palette?.neutral?.forEach((n, i) => {
    if (n?.hex) out.push({ name: `Neutral ${i + 1}`, hex: n.hex });
  });
  if (palette?.semantic) {
    (['success', 'warning', 'error', 'info'] as const).forEach((k) => {
      const c = palette.semantic?.[k];
      if (c?.hex) out.push({ name: k.charAt(0).toUpperCase() + k.slice(1), hex: c.hex });
    });
  }
  return out;
}

function buildPaletteJson(brand: Brand): string {
  const swatches = collectSwatches(brand);
  return JSON.stringify(
    {
      brand: brand.name,
      swatches,
    },
    null,
    2,
  );
}

function buildPaletteCss(brand: Brand): string {
  const swatches = collectSwatches(brand);
  const lines = [':root {'];
  for (const s of swatches) {
    const slug = s.name.toLowerCase().replace(/\s+/g, '-');
    lines.push(`  --color-${slug}: ${s.hex};`);
  }
  lines.push('}');
  return lines.join('\n');
}

function buildPaletteScss(brand: Brand): string {
  const swatches = collectSwatches(brand);
  return swatches
    .map((s) => `$${s.name.toLowerCase().replace(/\s+/g, '-')}: ${s.hex};`)
    .join('\n');
}

function buildPaletteSvg(brand: Brand): string {
  const swatches = collectSwatches(brand);

  const w = 200;
  const h = 240;
  const total = swatches.length;
  const svgW = w * total + (total - 1) * 16 + 32;
  const svgH = h + 32;
  const rects = swatches
    .map((s, i) => {
      const x = 16 + i * (w + 16);
      return `
  <rect x="${x}" y="16" width="${w}" height="${h - 60}" fill="${s.hex}" />
  <text x="${x}" y="${h - 32}" font-family="Inter, sans-serif" font-size="14" font-weight="700" fill="#0a0a0f">${s.name}</text>
  <text x="${x}" y="${h - 16}" font-family="Inter, sans-serif" font-size="11" fill="#888">${s.hex.toUpperCase()}</text>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <rect width="${svgW}" height="${svgH}" fill="#fafafa" />${rects}
</svg>`;
}

function buildPaletteTxt(brand: Brand): string {
  const lines: string[] = [`${brand.name} · Color Palette`, ''];
  const swatches = collectSwatches(brand);
  for (const s of swatches) {
    lines.push(`${s.name}`);
    lines.push(`  HEX:  ${s.hex.toUpperCase()}`);
    lines.push(`  RGB:  ${formatRgb(s.hex)}`);
    lines.push(`  CMYK: ${formatCmyk(hexToCmyk(s.hex))}`);
    lines.push('');
  }
  return lines.join('\n');
}

function buildFontsTxt(brand: Brand): string {
  const lines: string[] = [`${brand.name} · Typography`, ''];
  if (brand.fonts?.primary) {
    lines.push(`Primary font: ${brand.fonts.primary}`);
    lines.push(`Google Fonts: https://fonts.google.com/?query=${encodeURIComponent(brand.fonts.primary)}`);
    lines.push('');
  }
  if (brand.fonts?.secondary) {
    lines.push(`Secondary font: ${brand.fonts.secondary}`);
    lines.push(`Google Fonts: https://fonts.google.com/?query=${encodeURIComponent(brand.fonts.secondary)}`);
  }
  return lines.join('\n');
}

function buildReadme(brand: Brand): string {
  return `${brand.name} — Brand Kit
Generated ${new Date().toLocaleString()} by BrandingOS

Contents
========
guidelines/   1-page brand guide PDF
logos/        Logo variants (PNG @ 500/1000/2000, SVG when available, PDF)
colors/       Palette in JSON / CSS / SCSS / SVG / TXT (with HEX / RGB / CMYK)
typography/   Font names + Google Fonts links
favicons/     16, 32, 48, 64, 128, 256, 512 PNG + favicon.ico

Need help? Open BrandingOS at /b/${brand.slug}/kit
`;
}

/**
 * Build the full brand kit ZIP.
 *
 * @param brand    The brand to export
 * @param onProgress Progress callback (0..100, label)
 */
export async function exportBrandKitZip(brand: Brand, onProgress?: ProgressFn): Promise<Blob> {
  const JSZipModule = await import('jszip');
  const JSZip = JSZipModule.default;
  const zip = new JSZip();
  const slug = safeName(brand.slug || brand.name);
  const root = zip.folder(`${slug}-brand-kit`);
  if (!root) throw new Error('Failed to create zip root folder');

  const report = (pct: number, label: string) => onProgress?.({ pct: Math.min(100, Math.round(pct)), label });

  // ── README ─────────────────────────────────────────────────────
  report(2, 'Preparing README');
  root.file('README.txt', buildReadme(brand));

  // ── COLORS ─────────────────────────────────────────────────────
  report(6, 'Building color guide');
  const colorsFolder = root.folder('colors')!;
  colorsFolder.file('palette.json', buildPaletteJson(brand));
  colorsFolder.file('palette.css', buildPaletteCss(brand));
  colorsFolder.file('palette.scss', buildPaletteScss(brand));
  colorsFolder.file('palette.svg', buildPaletteSvg(brand));
  colorsFolder.file('palette.txt', buildPaletteTxt(brand));

  // ── TYPOGRAPHY ─────────────────────────────────────────────────
  report(10, 'Adding typography');
  const typoFolder = root.folder('typography')!;
  typoFolder.file('fonts.txt', buildFontsTxt(brand));

  // ── LOGOS ──────────────────────────────────────────────────────
  const variants = generateLogoVariants(brand);
  const logosFolder = root.folder('logos')!;
  const logoSizes = [500, 1000, 2000];
  let pct = 12;
  const logoStep = variants.length === 0 ? 0 : 50 / variants.length;

  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    const variantFolder = logosFolder.folder(safeName(v.id))!;
    report(pct, `Logo · ${v.name}`);

    // PNG sizes
    for (const sz of logoSizes) {
      try {
        const blob = await rasterizeLogoVariant(v, sz);
        variantFolder.file(`${slug}-${safeName(v.id)}-${sz}.png`, blob);
      } catch (err) {
        console.warn(`[bulkExport] PNG ${v.id}@${sz} failed`, err);
      }
    }

    // SVG (only when source is a real .svg URL)
    const svgText = await fetchSvgIfPossible(v.logoSrc);
    if (svgText) {
      variantFolder.file(`${slug}-${safeName(v.id)}.svg`, svgText);
    }

    pct += logoStep;
  }

  // ── FAVICONS ───────────────────────────────────────────────────
  report(64, 'Generating favicons');
  const faviconUrl = logoUrl(brand, 'iconmark') || logoUrl(brand);
  if (faviconUrl) {
    try {
      const favicons = await generateFavicons(faviconUrl);
      const fav = root.folder('favicons')!;
      for (const f of favicons) {
        fav.file(`favicon-${f.size}.png`, f.blob);
      }
      const ico = await generateIcoFromFavicons(favicons);
      if (ico) fav.file('favicon.ico', ico);
    } catch (err) {
      console.warn('[bulkExport] favicons failed', err);
    }
  }

  // ── BRAND GUIDE PDF ────────────────────────────────────────────
  report(82, 'Building brand guide PDF');
  try {
    const pdfBlob = await generateBrandGuidePdf(brand);
    const guideFolder = root.folder('guidelines')!;
    guideFolder.file(`${slug}-brand-guide.pdf`, pdfBlob);
  } catch (err) {
    console.warn('[bulkExport] brand guide PDF failed', err);
  }

  // ── ZIP ASSEMBLY ───────────────────────────────────────────────
  report(94, 'Compressing');
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  report(100, 'Ready');
  return blob;
}
