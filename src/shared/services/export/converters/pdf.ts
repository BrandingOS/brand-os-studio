/**
 * PDF Converter — Flat (raster) and Editable (programmatic text/shapes)
 */
import type { ExportOptions, ExportResult } from '../types';

// ─── Utilities ───────────────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

// ─── Flat PDF (raster pages) ─────────────────────────────────────────

/**
 * Convert HTML elements to a flat PDF by rasterizing each page.
 * Each element becomes one PDF page with the design as an image.
 */
export async function htmlToPDFFlat(
  elements: HTMLElement[],
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(5);

  const { default: jsPDF } = await import('jspdf');
  const { captureElementForExport } = await import('@/shared/editor/exportCapture');
  onProgress?.(10);

  const scale = options.scale ?? 2;
  const orientation = options.orientation ?? 'landscape';

  // Determine page dimensions from first element
  const firstEl = elements[0];
  const rect = firstEl.getBoundingClientRect();
  const pageW = options.width ?? rect.width;
  const pageH = options.height ?? rect.height;

  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [pageW, pageH],
    hotfixes: ['px_scaling'],
  });

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    // Use shared capture utility (handles SVG sizing, CSS filters, container queries)
    const canvas = await captureElementForExport(el, {
      width: pageW,
      height: pageH,
      scale,
      backgroundColor: options.backgroundColor === null ? null : (options.backgroundColor || '#ffffff'),
    });

    if (i > 0) {
      doc.addPage([pageW, pageH], orientation);
    }

    doc.addImage(
      canvas.toDataURL('image/jpeg', 0.92),
      'JPEG',
      0, 0,
      pageW, pageH,
    );

    const progress = Math.round(((i + 1) / elements.length) * 90 + 10);
    onProgress?.(progress);
  }

  const blob = doc.output('blob');
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.pdf`,
    mimeType: 'application/pdf',
  };
}

/**
 * Convert a Fabric.js canvas to a flat PDF.
 */
export async function fabricToPDFFlat(
  fabricCanvas: any,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(10);

  const { default: jsPDF } = await import('jspdf');

  const multiplier = options.scale ?? 2;
  const dataUrl = fabricCanvas.toDataURL({
    format: 'png',
    quality: 1,
    multiplier,
  });
  onProgress?.(50);

  const w = fabricCanvas.getWidth();
  const h = fabricCanvas.getHeight();
  const orientation = w > h ? 'landscape' : 'portrait';

  const doc = new jsPDF({
    orientation,
    unit: 'px',
    format: [w, h],
    hotfixes: ['px_scaling'],
  });

  doc.addImage(dataUrl, 'PNG', 0, 0, w, h);
  onProgress?.(90);

  const blob = doc.output('blob');
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.pdf`,
    mimeType: 'application/pdf',
  };
}

// ─── Editable PDF (programmatic) ─────────────────────────────────────

type PDFBuilder = (doc: any) => Promise<void>;

/**
 * Build an editable PDF using a feature-specific builder function.
 * The builder uses jsPDF API directly for real text/shapes.
 */
export async function buildEditablePDF(
  pdfBuilder: PDFBuilder,
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(10);

  const { default: jsPDF } = await import('jspdf');

  const orientation = options.orientation ?? 'portrait';
  const format = options.pageFormat ?? 'a4';

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: Array.isArray(format) ? format : format,
  });

  onProgress?.(20);
  await pdfBuilder(doc);
  onProgress?.(90);

  const blob = doc.output('blob');
  onProgress?.(100);

  return {
    blob,
    filename: `${options.filename}.pdf`,
    mimeType: 'application/pdf',
  };
}

// ─── PDF Primitives (shared by feature-specific builders) ────────────

export const pdfPrimitives = {
  hexToRgb,

  drawAccentBar(doc: any, color: string, pageWidth: number, height = 4) {
    const { r, g, b } = hexToRgb(color);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, height, 'F');
  },

  drawPageHeader(doc: any, brandName: string, pageTitle: string, accentColor: string, pageWidth: number) {
    const { r, g, b } = hexToRgb(accentColor);
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 4, 'F');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(brandName, 20, 16);
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(pageTitle, 20, 30);
  },

  drawPageFooter(doc: any, brandName: string, pageNumber: number, pageWidth: number, pageHeight: number, accentColor: string) {
    const { r, g, b } = hexToRgb(accentColor);
    doc.setFillColor(r, g, b);
    doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${brandName} — Brand Guidelines`, 20, pageHeight - 6);
    doc.text(`${pageNumber}`, pageWidth - 20, pageHeight - 6, { align: 'right' });
  },

  drawColorSwatch(doc: any, hex: string, x: number, y: number, size = 15) {
    const { r, g, b } = hexToRgb(hex);
    doc.setFillColor(r, g, b);
    doc.roundedRect(x, y, size, size, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(hex.toUpperCase(), x, y + size + 4);
  },
};
