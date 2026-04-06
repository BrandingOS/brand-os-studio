/**
 * PPTX Converter — PowerPoint from HTML elements or slide definitions
 *
 * Uses pptxgenjs to create .pptx files.
 * Renders HTML pages via html2canvas and embeds as full-slide background images.
 */
import type { ExportOptions, ExportResult } from '../types';

/**
 * Convert HTML elements (slides) to a PPTX file.
 * Each element becomes one slide with the design as a background image.
 */
export async function htmlToPPTX(
  elements: HTMLElement[],
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(5);

  const PptxGenJS = (await import('pptxgenjs')).default;
  const { captureElementForExport } = await import('@/shared/editor/exportCapture');
  onProgress?.(10);

  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5" (widescreen 16:9)

  const scale = options.scale ?? 2;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    // Use shared capture utility (handles SVG sizing, CSS filters, container queries)
    const canvas = await captureElementForExport(el, {
      scale,
      backgroundColor: options.backgroundColor === null ? null : (options.backgroundColor || '#ffffff'),
    });

    // Convert to base64 data URL
    const dataUrl = canvas.toDataURL('image/png');

    // Add slide with the image as background
    const slide = pptx.addSlide();
    slide.addImage({
      data: dataUrl,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%',
    });

    const progress = Math.round(((i + 1) / elements.length) * 85 + 10);
    onProgress?.(progress);
  }

  // Generate the PPTX file
  onProgress?.(95);
  const output = await pptx.write({ outputType: 'blob' });
  onProgress?.(100);

  return {
    blob: output as Blob,
    filename: `${options.filename}.pptx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
}

/**
 * Create a PPTX with programmatic slide definitions (editable text/shapes).
 * This is a future enhancement for producing truly editable PowerPoint files.
 */
export interface PPTXSlideDefinition {
  background?: string; // hex color or image URL
  elements: PPTXElement[];
}

export interface PPTXElement {
  type: 'text' | 'shape' | 'image';
  x: number; // inches
  y: number; // inches
  w: number; // inches
  h: number; // inches
  text?: string;
  fontSize?: number;
  fontFace?: string;
  color?: string;
  bold?: boolean;
  align?: 'left' | 'center' | 'right';
  fill?: string;
  imageUrl?: string;
}

export async function slidesToPPTX(
  slides: PPTXSlideDefinition[],
  options: ExportOptions,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(10);

  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';

  for (let i = 0; i < slides.length; i++) {
    const slideDef = slides[i];
    const slide = pptx.addSlide();

    // Set background
    if (slideDef.background) {
      if (slideDef.background.startsWith('#')) {
        slide.background = { fill: slideDef.background.replace('#', '') };
      }
    }

    // Add elements
    for (const el of slideDef.elements) {
      if (el.type === 'text' && el.text) {
        slide.addText(el.text, {
          x: el.x,
          y: el.y,
          w: el.w,
          h: el.h,
          fontSize: el.fontSize ?? 18,
          fontFace: el.fontFace ?? 'Arial',
          color: el.color?.replace('#', '') ?? '333333',
          bold: el.bold ?? false,
          align: el.align ?? 'left',
        });
      } else if (el.type === 'shape') {
        slide.addShape(pptx.ShapeType.rect, {
          x: el.x,
          y: el.y,
          w: el.w,
          h: el.h,
          fill: { color: el.fill?.replace('#', '') ?? 'CCCCCC' },
        });
      } else if (el.type === 'image' && el.imageUrl) {
        slide.addImage({
          path: el.imageUrl,
          x: el.x,
          y: el.y,
          w: el.w,
          h: el.h,
        });
      }
    }

    const progress = Math.round(((i + 1) / slides.length) * 85 + 10);
    onProgress?.(progress);
  }

  onProgress?.(95);
  const output = await pptx.write({ outputType: 'blob' });
  onProgress?.(100);

  return {
    blob: output as Blob,
    filename: `${options.filename}.pptx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
}
