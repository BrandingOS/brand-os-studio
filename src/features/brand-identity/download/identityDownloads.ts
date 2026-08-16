/**
 * Taking a piece of the brand away.
 *
 * Everything here answers one request — "give me this" — and the download sits
 * beside the thing it belongs to rather than in a toolbar somewhere else. A
 * bundle is offered per SECTION as well as for the whole identity, because
 * people want "all the logos" far more often than they want "everything".
 *
 * Built on `downloadBlob` and `buildZip`, the utilities the rest of the product
 * already downloads through. A fourth implementation of objectURL-plus-anchor
 * is how a codebase ends up with four subtly different filename conventions.
 */
import { buildZip, downloadBlob, slugify } from '@/features/setup/utils/downloads';
import type { IdentityColour, IdentityFont, IdentityLogo, IdentityModel } from '../identityModel';

/** Fetches a url — remote, or a `data:` URL — as bytes. Null if unreadable. */
export async function fetchAsBlob(url: string): Promise<Blob | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.blob();
  } catch {
    return null;
  }
}

/** The extension a url implies. Data URLs carry their type in the header. */
export function extensionOf(url: string, fallback = 'png'): string {
  const data = /^data:image\/([a-z0-9+]+)/i.exec(url);
  if (data) return data[1].replace('svg+xml', 'svg');
  const path = /\.([a-z0-9]+)(?:\?|$)/i.exec(url);
  return path ? path[1].toLowerCase() : fallback;
}

export async function downloadLogo(brandName: string, logo: IdentityLogo): Promise<void> {
  const blob = await fetchAsBlob(logo.url);
  if (!blob) return;
  const ext = extensionOf(logo.url, logo.format || 'png');
  downloadBlob(blob, `${slugify(brandName)}-${slugify(logo.def.label)}.${ext}`);
}

/**
 * A colour, as something you can put in a document.
 *
 * An SVG rather than a PNG: it is a flat fill, so a vector is both smaller and
 * usable at any size, and it carries the hex as text inside the file — which
 * means the swatch still says what it is after it has been dragged somewhere
 * and renamed.
 */
export function colourSvg(colour: IdentityColour): Blob {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <title>${colour.hex}</title>
  <rect width="512" height="512" fill="${colour.hex}"/>
</svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}

export function downloadColour(brandName: string, colour: IdentityColour): void {
  downloadBlob(
    colourSvg(colour),
    `${slugify(brandName)}-${slugify(colour.role)}-${colour.hex.replace('#', '')}.svg`,
  );
}

/**
 * A typeface, as whatever the brand actually owns.
 *
 * When the brand uploaded binaries those ARE the download — the exact files
 * they licensed, in the format they licensed them. When it only named a family
 * there is nothing to hand over, so the caller offers nothing rather than a zip
 * containing a text file with a font's name in it.
 */
export async function downloadFont(brandName: string, font: IdentityFont): Promise<boolean> {
  if (font.files.length === 0) return false;
  await buildZip(`${slugify(brandName)}-${slugify(font.token.family)}.zip`, async (zip) => {
    for (const file of font.files) {
      const blob = await fetchAsBlob(file.dataUrl);
      if (blob) zip.file(file.name, blob);
    }
  });
  return true;
}

export async function downloadAllLogos(model: IdentityModel): Promise<void> {
  await buildZip(`${slugify(model.name)}-logos.zip`, async (zip) => {
    for (const logo of model.logo.variants) {
      const blob = await fetchAsBlob(logo.url);
      if (!blob) continue;
      const ext = extensionOf(logo.url, logo.format || 'png');
      zip.file(`${slugify(logo.def.label)}.${ext}`, blob);
    }
  });
}

export async function downloadAllColours(model: IdentityModel): Promise<void> {
  await buildZip(`${slugify(model.name)}-colours.zip`, async (zip) => {
    for (const colour of model.colour.colours) {
      zip.file(`${slugify(colour.role)}-${colour.hex.replace('#', '')}.svg`, colourSvg(colour));
    }
    // The palette as data, for anyone wiring it into code rather than opening
    // it in a design tool.
    zip.file(
      'palette.json',
      JSON.stringify(
        model.colour.colours.map((c) => ({ role: c.role, hex: c.hex, rgb: c.rgb, cmyk: c.cmyk })),
        null,
        2,
      ),
    );
  });
}
