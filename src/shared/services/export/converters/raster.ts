/**
 * Raster Converter — PNG & JPG from HTML elements and Fabric canvases
 */
import type { ExportOptions, ExportResult, RasterFormat } from '../types';
import { captureElementForExport } from '@/shared/editor/exportCapture';

/**
 * Convert an HTML element to a raster image (PNG or JPG).
 */
export async function htmlToRaster(
  element: HTMLElement,
  format: RasterFormat,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(10);
  onProgress?.(20);

  const scale = options.scale ?? 2;
  // Use shared capture utility (handles SVG sizing, CSS filters, container queries)
  const canvas = await captureElementForExport(element, {
    scale,
    backgroundColor: options.backgroundColor === null ? null : (options.backgroundColor || '#ffffff'),
  });
  onProgress?.(80);

  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpg' ? (options.quality ?? 0.92) : undefined;
  const ext = format === 'jpg' ? 'jpg' : 'png';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))),
      mimeType,
      quality,
    );
  });
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.${ext}`,
    mimeType,
  };
}

/**
 * Convert a Fabric.js canvas to a raster image (PNG or JPG).
 */
export async function fabricToRaster(
  fabricCanvas: any,
  format: RasterFormat,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(20);

  const multiplier = options.scale ?? 2;
  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
  const quality = format === 'jpg' ? (options.quality ?? 0.92) : 1;
  const ext = format === 'jpg' ? 'jpg' : 'png';

  const dataUrl = fabricCanvas.toDataURL({
    format: format === 'jpg' ? 'jpeg' : 'png',
    quality,
    multiplier,
  });
  onProgress?.(70);

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.${ext}`,
    mimeType,
  };
}

/**
 * Convert multiple HTML elements to raster images (for multi-page exports).
 */
export async function multiPageRaster(
  elements: HTMLElement[],
  format: RasterFormat,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult[]> {
  const results: ExportResult[] = [];

  for (let i = 0; i < elements.length; i++) {
    const pageProgress = (pct: number) => {
      const overall = ((i + pct / 100) / elements.length) * 100;
      onProgress?.(Math.round(overall));
    };

    const result = await htmlToRaster(elements[i], format, {
      ...options,
      filename: `${options.filename}-${i + 1}`,
    }, pageProgress);

    results.push(result);
  }

  return results;
}
