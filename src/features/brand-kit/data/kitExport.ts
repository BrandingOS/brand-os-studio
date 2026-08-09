/**
 * Brand Kit bundle exports (KIT-02 / KIT-03).
 *
 * Real downloadable artifacts for the kit surfaces that previously
 * only toasted a placeholder:
 *  - Logos  → zip of every logo variant as SVG + PNG
 *  - About  → markdown document of the brand's About sections
 *  - Export kit → one zip bundling colors + fonts + logos + about +
 *    a machine-readable brand.json
 */
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  buildBaseColorSvg,
  buildShadeRows,
  buildShadesSvg,
  rasterizeSvg,
  triggerBlobDownload,
  type PaletteColor,
} from './colorPaletteExport';

export function slugifyName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'brand';
}

/** Flatten the mock brand's palette into the exporter's shape. */
export function paletteOf(brand: MockBrand): PaletteColor[] {
  const CORE_ROLES = ['Primary', 'Secondary', 'Background'] as const;
  return [
    ...brand.colors.core.map((c, i) => ({
      hex: c.hex,
      name: c.name,
      role: CORE_ROLES[i] ?? `Core ${i + 1}`,
    })),
    ...brand.colors.accent.map((c) => ({ hex: c.hex, name: c.name, role: 'Accent' })),
    ...brand.colors.grey.map((c) => ({ hex: c.hex, name: c.name, role: 'Neutral' })),
  ];
}

type ZipFolder = {
  file: (name: string, data: Blob | string) => unknown;
  folder: (name: string) => ZipFolder | null;
};

/** Add every logo variant (SVG + PNG) into a zip folder. */
export async function addLogosToZip(folder: ZipFolder, brand: MockBrand): Promise<number> {
  let added = 0;
  for (const logo of brand.logos) {
    if (!logo.svg) continue;
    const base = slugifyName(`${logo.label || 'logo'}-${logo.variant || added + 1}`);
    folder.file(`${base}.svg`, logo.svg);
    try {
      const { png } = await rasterizeSvg(logo.svg, 600, 600);
      if (png) folder.file(`${base}.png`, png);
    } catch {
      // SVG rasterization can fail on exotic markup — the .svg still ships.
    }
    added += 1;
  }
  return added;
}

/** Markdown document of the brand's About sections + voice. */
export function buildAboutMarkdown(brand: MockBrand): string {
  const lines: string[] = [`# ${brand.name}`, ''];
  for (const entry of brand.about) {
    if (!entry.content.trim()) continue;
    lines.push(`## ${entry.title}`, '', entry.content.trim(), '');
  }
  if (brand.voice?.essay?.trim()) {
    lines.push('## Voice', '', brand.voice.essay.trim(), '');
  }
  return lines.join('\n');
}

/** Zip of logo variants only (the Logos card download). */
export async function downloadLogosZip(brand: MockBrand): Promise<number> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const count = await addLogosToZip(zip as unknown as ZipFolder, brand);
  if (count === 0) return 0;
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, `${slugifyName(brand.name)}-logos.zip`);
  return count;
}

/** The About card download — a .md file. */
export function downloadAboutDoc(brand: MockBrand): void {
  const md = buildAboutMarkdown(brand);
  triggerBlobDownload(
    new Blob([md], { type: 'text/markdown;charset=utf-8' }),
    `${slugifyName(brand.name)}-about.md`,
  );
}

/**
 * The top-right "Export kit" action: one zip with colors/, fonts/,
 * logos/, about.md and brand.json. Colors reuse the palette bundle
 * builder (each color as its own sub-zip would be odd inside a kit,
 * so the full palette zip is unpacked into a colors/ folder by
 * generating it fresh here).
 */
export async function downloadKitZip(
  brand: MockBrand,
  opts?: { onProgress?: (step: string) => void },
): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  opts?.onProgress?.('colors');
  // Kit bundle keeps colors LIGHT: brand colors only (core + accent,
  // not the 27-step neutral ramp) as svg + png. The dedicated Colors
  // download still produces the full-fidelity bundle (all colors,
  // shades, jpg + ai) via buildAllColorsZip.
  const colorsDir = zip.folder('colors');
  if (colorsDir) {
    const CORE_ROLES = ['Primary', 'Secondary', 'Background'] as const;
    const kitColors: PaletteColor[] = [
      ...brand.colors.core.map((c, i) => ({
        hex: c.hex,
        name: c.name,
        role: CORE_ROLES[i] ?? `Core ${i + 1}`,
      })),
      ...brand.colors.accent.map((c) => ({ hex: c.hex, name: c.name, role: 'Accent' })),
    ];
    const used = new Set<string>();
    for (const color of kitColors) {
      let folderName = color.name;
      let n = 2;
      while (used.has(folderName)) {
        folderName = `${color.name} ${n}`;
        n += 1;
      }
      used.add(folderName);
      const dir = colorsDir.folder(folderName);
      if (!dir) continue;
      const safe = slugifyName(folderName);
      const baseSvg = buildBaseColorSvg(color);
      dir.file(`${safe}.svg`, baseSvg);
      const { png } = await rasterizeSvg(baseSvg, 600, 400);
      if (png) dir.file(`${safe}.png`, png);
      const shades = buildShadeRows(color.hex);
      const shadesSvg = buildShadesSvg(shades);
      dir.file(`${safe}-shades.svg`, shadesSvg);
    }
  }

  opts?.onProgress?.('fonts');
  // Fonts: ship the files the user actually uploaded (data URLs decoded
  // to bytes) plus a manifest naming every family. Google-hosted
  // families are documented in the manifest rather than fetched here —
  // the dedicated Fonts download owns the full remote-bundle path.
  const fontsDir = zip.folder('fonts');
  if (fontsDir) {
    const dataUrlToBytes = (dataUrl: string): Uint8Array | null => {
      try {
        const idx = dataUrl.indexOf(',');
        if (idx < 0) return null;
        const meta = dataUrl.slice(0, idx);
        const payload = dataUrl.slice(idx + 1);
        if (/;base64$/i.test(meta)) {
          const bin = atob(payload);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
          return bytes;
        }
        return null;
      } catch {
        return null;
      }
    };
    for (const f of brand.fonts) {
      for (const file of f.files ?? []) {
        const bytes = dataUrlToBytes(file.dataUrl);
        if (bytes) fontsDir.file(file.name, bytes);
      }
    }
    fontsDir.file(
      'fonts.txt',
      brand.fonts
        .map((f) => `${f.family} — ${f.weights || 'Regular'}${f.files?.length ? '' : ' (Google Fonts)'}`)
        .join('\n'),
    );
  }

  opts?.onProgress?.('logos');
  const logosDir = zip.folder('logos');
  if (logosDir) await addLogosToZip(logosDir as unknown as ZipFolder, brand);

  opts?.onProgress?.('about');
  zip.file('about.md', buildAboutMarkdown(brand));
  zip.file(
    'brand.json',
    JSON.stringify(
      {
        name: brand.name,
        colors: paletteOf(brand),
        fonts: brand.fonts.map((f) => ({ family: f.family, weights: f.weights })),
        icons: brand.icons,
        about: brand.about,
      },
      null,
      2,
    ),
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, `${slugifyName(brand.name)}-brand-kit.zip`);
}
