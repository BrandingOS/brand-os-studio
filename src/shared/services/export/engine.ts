/**
 * Universal Export Engine — Orchestrator
 *
 * Routes export requests to the correct converter based on source type and format.
 * Handles download, ZIP bundling, and progress aggregation.
 */
import type { ExportRequest, ExportResult, ExportFormat, ExportSource, ExportOptions } from './types';

// ─── Main Export Function ────────────────────────────────────────────

/**
 * Export a design to the specified format.
 * Routes to the correct converter based on source.type and format.
 */
export async function exportDesign(request: ExportRequest): Promise<ExportResult> {
  const { source, format, options, onProgress } = request;

  switch (format) {
    case 'png':
    case 'jpg':
      return exportRaster(source, format, options, onProgress);
    case 'svg':
      return exportSVG(source, options, onProgress);
    case 'svg-editable':
      return exportSVGEditable(source, options, onProgress);
    case 'pdf-flat':
      return exportPDFFlat(source, options, onProgress);
    case 'pdf-editable':
      return exportPDFEditable(source, options, onProgress);
    case 'pptx':
      return exportPPTX(source, options, onProgress);
    case 'mp4':
      return exportVideo(source, options, onProgress);
    case 'gif':
      return exportGIF(source, options, onProgress);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

// ─── Format Routers ──────────────────────────────────────────────────

async function exportRaster(
  source: ExportSource, format: 'png' | 'jpg', options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  const { htmlToRaster, fabricToRaster, multiPageRaster } = await import('./converters/raster');

  if (source.type === 'fabric-canvas' && source.fabricCanvas) {
    return fabricToRaster(source.fabricCanvas, format, options, onProgress);
  }

  const elements = resolveElements(source);
  if (elements.length === 1) {
    return htmlToRaster(elements[0], format, options, onProgress);
  }

  // Multi-page: return first page for single export, use exportMultipleAsZip for batch
  return htmlToRaster(elements[0], format, options, onProgress);
}

async function exportSVG(
  source: ExportSource, options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  // Prefer programmatic SVG builder for true vector output
  if (source.svgBuilder) {
    onProgress?.(30);
    const svgString = source.svgBuilder();
    onProgress?.(80);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    onProgress?.(100);
    return { blob, filename: `${options.filename}.svg`, mimeType: 'image/svg+xml' };
  }

  const { fabricToSVG, htmlToSVG } = await import('./converters/svg');

  if (source.type === 'fabric-canvas' && source.fabricCanvas) {
    return fabricToSVG(source.fabricCanvas, options, onProgress);
  }

  const elements = resolveElements(source);
  return htmlToSVG(elements[0], options, onProgress);
}

async function exportPDFFlat(
  source: ExportSource, options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  const { htmlToPDFFlat, fabricToPDFFlat } = await import('./converters/pdf');

  if (source.type === 'fabric-canvas' && source.fabricCanvas) {
    return fabricToPDFFlat(source.fabricCanvas, options, onProgress);
  }

  const elements = resolveElements(source);
  return htmlToPDFFlat(elements, options, onProgress);
}

async function exportPDFEditable(
  source: ExportSource, options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  // Path 1 — caller supplied a programmatic builder (e.g. business cards, invoices).
  if (source.pdfBuilder) {
    const { buildEditablePDF } = await import('./converters/pdf');
    return buildEditablePDF(source.pdfBuilder, options, onProgress);
  }

  // Path 2 — generic DOM-to-vector pipeline. Walks the slide DOM, emits IR,
  // builds a real jsPDF document with editable text + shapes.
  const { htmlToVectorPDF } = await import('./converters/pdf');
  const elements = resolveElements(source);
  return htmlToVectorPDF(elements, options, onProgress);
}

async function exportSVGEditable(
  source: ExportSource, options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  // Path 1 — caller supplied a programmatic SVG builder.
  if (source.svgBuilder) {
    onProgress?.(30);
    const svg = source.svgBuilder();
    onProgress?.(100);
    return { blob: new Blob([svg], { type: 'image/svg+xml' }), filename: `${options.filename}.svg`, mimeType: 'image/svg+xml' };
  }

  // Path 2 — DOM-to-vector pipeline.
  const { htmlToVectorSVG } = await import('./converters/svg');
  const elements = resolveElements(source);
  return htmlToVectorSVG(elements[0], options, onProgress);
}

async function exportPPTX(
  source: ExportSource, options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  // Prefer programmatic PPTX builder for real editable slides
  if (source.pptxBuilder) {
    return source.pptxBuilder(options.filename, onProgress);
  }

  const { htmlToPPTX } = await import('./converters/pptx');
  const elements = resolveElements(source);
  return htmlToPPTX(elements, options, onProgress);
}

async function exportVideo(
  source: ExportSource, options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  if (!source.frameGenerator) {
    throw new Error('mp4 export requires a frameGenerator in the source');
  }

  const { framesToMP4 } = await import('./converters/video');
  return framesToMP4(source.frameGenerator, options, onProgress);
}

async function exportGIF(
  source: ExportSource, options: ExportOptions, onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  if (!source.frameGenerator) {
    throw new Error('gif export requires a frameGenerator in the source');
  }

  const { framesToGIF } = await import('./converters/gif');
  return framesToGIF(source.frameGenerator, options, onProgress);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function resolveElements(source: ExportSource): HTMLElement[] {
  if (source.element) {
    return Array.isArray(source.element) ? source.element : [source.element];
  }
  if (source.selector) {
    const els = document.querySelectorAll<HTMLElement>(source.selector);
    if (els.length === 0) throw new Error(`No elements found for selector: ${source.selector}`);
    return Array.from(els);
  }
  throw new Error('Export source must provide element, selector, or fabricCanvas');
}

/**
 * Trigger a browser download for the given export result.
 */
export function downloadResult(result: ExportResult): void {
  const url = URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export and immediately download.
 */
export async function exportAndDownload(request: ExportRequest): Promise<void> {
  const result = await exportDesign(request);
  downloadResult(result);
}

/**
 * Export multiple pages/formats and bundle as ZIP.
 */
export async function exportMultipleAsZip(
  requests: ExportRequest[],
  zipFilename: string,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (let i = 0; i < requests.length; i++) {
    const request = requests[i];
    const result = await exportDesign({
      ...request,
      onProgress: (pct) => {
        const overall = Math.round(((i + pct / 100) / requests.length) * 100);
        onProgress?.(overall);
      },
    });
    zip.file(result.filename, result.blob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  onProgress?.(100);

  return {
    blob,
    filename: zipFilename,
    mimeType: 'application/zip',
  };
}

/**
 * Export all pages of a multi-page design as individual files in a ZIP.
 */
export async function exportPagesAsZip(
  elements: HTMLElement[],
  format: 'png' | 'jpg',
  baseFilename: string,
  options: Partial<ExportOptions> = {},
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  const { multiPageRaster } = await import('./converters/raster');

  const results = await multiPageRaster(
    elements,
    format,
    { filename: baseFilename, ...options } as ExportOptions,
    onProgress,
  );

  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  for (const result of results) {
    zip.file(result.filename, result.blob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });

  return {
    blob,
    filename: `${baseFilename}-${format}.zip`,
    mimeType: 'application/zip',
  };
}
