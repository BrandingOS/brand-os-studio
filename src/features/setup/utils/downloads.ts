import JSZip from 'jszip';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export function slugify(s: string): string {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  );
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Rasterize an SVG string to a PNG or JPEG blob at the given size.
 *  JPEG gets a white background because JPG doesn't support alpha. */
export function svgToRasterBlob(
  svg: string,
  mime: 'image/png' | 'image/jpeg' = 'image/png',
  size = 512,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas unsupported'));
        return;
      }
      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
      }
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) resolve(blob);
          else reject(new Error('toBlob failed'));
        },
        mime,
        mime === 'image/jpeg' ? 0.92 : undefined,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG load failed'));
    };
    img.src = url;
  });
}

/** Serialize a live SVG DOM node to a clean, standalone string with
 *  xmlns declaration. Used when the icon is already mounted in the DOM
 *  (marquee tiles) so animation state/styling is captured too. */
export function serializeSvgNode(node: SVGElement): string {
  const cloned = node.cloneNode(true) as SVGElement;
  cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  cloned.removeAttribute('class');
  const xml = new XMLSerializer().serializeToString(cloned);
  return xml.startsWith('<?xml') ? xml : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

/** Render a React element (expected to be an <svg>) to a standalone
 *  SVG string suitable for saving as .svg. Adds the xmlns attribute if
 *  the component didn't set it. */
export function renderIconToSvg(element: ReactElement): string {
  const body = renderToStaticMarkup(element);
  if (/xmlns=/.test(body)) return body;
  return body.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
}

const WEIGHT_LABELS: Record<number, string> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/** Turn a family name into PascalCase without spaces for use in
 *  filenames: "Open Sans" → "OpenSans". */
function familyToFilePrefix(family: string): string {
  return (
    family
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'Font'
  );
}

/** Parse a Google Fonts CSS payload and produce a URL → meaningful
 *  filename map. Each @font-face block contributes one file named from
 *  the family, weight, italic flag, and the subset comment that
 *  precedes the block (e.g. "/* latin *\/"). */
function planFontFilenames(
  family: string,
  css: string,
): Map<string, string> {
  const prefix = familyToFilePrefix(family);
  const blockRe =
    /(\/\*\s*([^*]*?)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g;
  const used = new Set<string>();
  const result = new Map<string, string>();
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css)) !== null) {
    const subset = (match[2] ?? '').trim();
    const body = match[3];
    const urlMatch = body.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;
    const url = urlMatch[1];
    if (result.has(url)) continue;
    const weightMatch = body.match(/font-weight:\s*(\d+)/);
    const weight = weightMatch ? parseInt(weightMatch[1], 10) : 400;
    const styleMatch = body.match(/font-style:\s*(italic|normal)/i);
    const italic = !!styleMatch && /italic/i.test(styleMatch[1]);
    const label =
      (WEIGHT_LABELS[weight] ?? String(weight)) + (italic ? 'Italic' : '');
    const subsetSlug = subset
      ? subset.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : '';
    let base = subsetSlug
      ? `${prefix}-${label}-${subsetSlug}`
      : `${prefix}-${label}`;
    let name = `${base}.woff2`;
    let n = 2;
    while (used.has(name)) {
      name = `${base}-${n}.woff2`;
      n += 1;
    }
    used.add(name);
    result.set(url, name);
  }
  return result;
}

/** Fetch Google Fonts woff2 files for one family. Returns the original
 *  CSS, a localized CSS that references the bundled files by name, and
 *  the files themselves (renamed from their content hashes to
 *  human-readable weight/subset labels). Null on network failure. */
async function fetchGoogleFontsWoff2(family: string): Promise<{
  css: string;
  localizedCss: string;
  files: Array<{ name: string; blob: Blob }>;
} | null> {
  const encoded = encodeURIComponent(family).replace(/%20/g, '+');
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;500;600;700&display=swap`;
  try {
    const cssRes = await fetch(cssUrl);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const nameMap = planFontFilenames(family, css);
    const files: Array<{ name: string; blob: Blob }> = [];
    let localizedCss = css;
    for (const [url, name] of nameMap) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const raw = await res.arrayBuffer();
        const blob = new Blob([raw], { type: 'font/woff2' });
        files.push({ name, blob });
        localizedCss = localizedCss.split(url).join(`woff2/${name}`);
      } catch {
        /* skip individual failures */
      }
    }
    return { css, localizedCss, files };
  } catch {
    return null;
  }
}

type GwfhVariant = {
  id: string;
  fontStyle?: string;
  fontWeight?: string;
  ttf?: string;
  woff?: string;
  woff2?: string;
  eot?: string;
};

/** Fetch desktop-installable TTF files from the google-webfonts-helper
 *  service. Returns files per variant named Family-Weight[Italic].ttf.
 *  Null on failure — callers should fall back to woff2-only. */
async function fetchGwfhTtf(family: string): Promise<{
  files: Array<{ name: string; blob: Blob }>;
  variants: Array<{
    family: string;
    weight: number;
    italic: boolean;
    ttfName: string | null;
  }>;
} | null> {
  const slug = family.toLowerCase().replace(/\s+/g, '-');
  try {
    const res = await fetch(
      `https://gwfh.mranftl.com/api/fonts/${encodeURIComponent(slug)}?subsets=latin`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      family?: string;
      variants?: GwfhVariant[];
    };
    const variantsRaw = data.variants ?? [];
    if (variantsRaw.length === 0) return null;
    const prefix = familyToFilePrefix(family);
    const files: Array<{ name: string; blob: Blob }> = [];
    const variants: Array<{
      family: string;
      weight: number;
      italic: boolean;
      ttfName: string | null;
    }> = [];
    for (const v of variantsRaw) {
      const weight = parseInt(v.fontWeight ?? '400', 10) || 400;
      const italic = (v.fontStyle ?? 'normal') === 'italic';
      const label =
        (WEIGHT_LABELS[weight] ?? String(weight)) + (italic ? 'Italic' : '');
      const ttfName = `${prefix}-${label}.ttf`;
      let storedName: string | null = null;
      if (v.ttf) {
        try {
          const r = await fetch(v.ttf);
          if (r.ok) {
            const buf = await r.arrayBuffer();
            files.push({
              name: ttfName,
              blob: new Blob([buf], { type: 'font/ttf' }),
            });
            storedName = ttfName;
          }
        } catch {
          /* skip variant on network failure */
        }
      }
      variants.push({ family, weight, italic, ttfName: storedName });
    }
    return { files, variants };
  } catch {
    return null;
  }
}

/** Build a fonts.css from gwfh variants that references both the local
 *  TTF and (if present) the local WOFF2 files. WOFF2 is preferred by
 *  browsers because of size; TTF is the desktop-installable fallback. */
function buildCombinedFontCss(
  family: string,
  ttfVariants: Array<{
    family: string;
    weight: number;
    italic: boolean;
    ttfName: string | null;
  }>,
  woff2Map: Map<string, string>,
): string {
  const parts: string[] = [`/* ${family} — BrandingOS export */`, ''];
  for (const v of ttfVariants) {
    if (!v.ttfName) continue;
    const sources: string[] = [];
    // Prefer woff2 if we have one for the same weight+style (any subset).
    const woff2 = [...woff2Map.entries()].find(([, name]) => {
      const label =
        (WEIGHT_LABELS[v.weight] ?? String(v.weight)) +
        (v.italic ? 'Italic' : '');
      return name.startsWith(`${familyToFilePrefix(family)}-${label}`);
    });
    if (woff2) sources.push(`url('woff2/${woff2[1]}') format('woff2')`);
    sources.push(`url('ttf/${v.ttfName}') format('truetype')`);
    parts.push(
      [
        '@font-face {',
        `  font-family: '${family}';`,
        `  font-style: ${v.italic ? 'italic' : 'normal'};`,
        `  font-weight: ${v.weight};`,
        `  font-display: swap;`,
        `  src: ${sources.join(', ')};`,
        '}',
        '',
      ].join('\n'),
    );
  }
  return parts.join('\n');
}

/** Fetch a complete font package: TTF files (desktop install) in `ttf`
 *  and WOFF2 (web) in `woff2`, plus a fonts.css that wires both. Falls
 *  back gracefully if either source is unreachable. Null only when both
 *  TTF and WOFF2 lookups fail. */
export async function fetchGoogleFontPackage(family: string): Promise<{
  ttfFiles: Array<{ name: string; blob: Blob }>;
  woff2Files: Array<{ name: string; blob: Blob }>;
  fontsCss: string;
  googleCssFallback: string | null;
} | null> {
  const [ttfPkg, woff2Pkg] = await Promise.all([
    fetchGwfhTtf(family),
    fetchGoogleFontsWoff2(family),
  ]);
  const ttfFiles = ttfPkg?.files ?? [];
  const woff2Files = woff2Pkg?.files ?? [];
  if (ttfFiles.length === 0 && woff2Files.length === 0) return null;
  const woff2NameByUrl = new Map<string, string>();
  woff2Pkg?.files.forEach((f) => woff2NameByUrl.set(f.name, f.name));
  let fontsCss = '';
  if (ttfPkg) {
    fontsCss = buildCombinedFontCss(family, ttfPkg.variants, woff2NameByUrl);
  } else if (woff2Pkg) {
    // No TTF variants — just ship the Google CSS pointing at woff2.
    fontsCss = woff2Pkg.localizedCss;
  }
  return {
    ttfFiles,
    woff2Files,
    fontsCss,
    googleCssFallback: woff2Pkg?.localizedCss ?? null,
  };
}

/** Build and download a zip. The caller populates it inside the builder. */
export async function buildZip(
  filename: string,
  build: (zip: JSZip) => Promise<void> | void,
): Promise<void> {
  const zip = new JSZip();
  await build(zip);
  const blob = await zip.generateAsync({ type: 'blob' });
  downloadBlob(blob, filename);
}
