/**
 * SVG Converter — True vector from Fabric, high-res raster SVG from HTML
 */
import type { ExportOptions, ExportResult } from '../types';

/**
 * Convert a Fabric.js canvas to TRUE vector SVG.
 * This produces real <text>, <rect>, <path> elements.
 */
export async function fabricToSVG(
  fabricCanvas: any,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(30);

  const svgString = fabricCanvas.toSVG();
  onProgress?.(80);

  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.svg`,
    mimeType: 'image/svg+xml',
  };
}

/**
 * Convert an HTML element to a high-resolution raster SVG.
 * Renders via html2canvas at 4x, then embeds as <image> in SVG.
 * Not true vector, but high quality and scalable.
 */
export async function htmlToSVG(
  element: HTMLElement,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(10);
  const { captureElementForExport } = await import('@/shared/editor/exportCapture');
  onProgress?.(20);

  const scale = options.scale ?? 4;
  // Use shared capture utility (handles SVG sizing, CSS filters, container queries)
  const canvas = await captureElementForExport(element, {
    scale,
    backgroundColor: options.backgroundColor === null ? null : (options.backgroundColor || '#ffffff'),
  });
  onProgress?.(70);

  const dataUrl = canvas.toDataURL('image/png');
  const w = canvas.width;
  const h = canvas.height;

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="${w}" height="${h}" xlink:href="${dataUrl}" />
</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.svg`,
    mimeType: 'image/svg+xml',
  };
}

/**
 * Fetch a raw SVG file from a URL and return as ExportResult.
 * For logos and assets that are already SVG.
 */
export async function rawSVGFromUrl(
  url: string,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(20);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch SVG: ${response.status}`);

  const svgText = await response.text();
  onProgress?.(80);

  const blob = new Blob([svgText], { type: 'image/svg+xml' });
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.svg`,
    mimeType: 'image/svg+xml',
  };
}
