/**
 * Vector PPTX Builder — Produces REAL editable PowerPoint with text and shapes.
 *
 * NO raster images. Real editable text, shapes, and colors.
 * Opens correctly in PowerPoint, Google Slides, Keynote.
 */
import type { Brand } from '@/shared/types/brand';
import type { ExportResult } from '../types';

function hexToRgb(hex: string): string {
  // pptxgenjs uses hex without # prefix
  return hex.replace('#', '').toUpperCase();
}

function contrastHex(hex: string): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? '111111' : 'FFFFFF';
}

interface PresentationSlide {
  title: string;
  subtitle?: string;
  body?: string;
  type?: 'cover' | 'content' | 'section' | 'closing';
}

export async function buildPresentationPPTX(
  brand: Brand,
  slides: PresentationSlide[],
  filename: string,
  onProgress?: (pct: number) => void,
): Promise<ExportResult> {
  onProgress?.(10);

  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = brand.name;
  pptx.title = slides[0]?.title || brand.name;

  const p = hexToRgb(brand.primaryColor || '#333333');
  const contrast = contrastHex(brand.primaryColor || '#333333');

  for (let i = 0; i < slides.length; i++) {
    const slideData = slides[i];
    const slide = pptx.addSlide();
    const isCover = slideData.type === 'cover' || i === 0;
    const isClosing = slideData.type === 'closing' || i === slides.length - 1;

    if (isCover || isClosing) {
      // Full brand color background
      slide.background = { fill: p };

      // Title
      slide.addText(slideData.title, {
        x: 1,
        y: 2.5,
        w: 11.33,
        h: 1.5,
        fontSize: 44,
        fontFace: 'Arial',
        color: contrast,
        bold: true,
        align: 'center',
      });

      // Subtitle
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 2,
          y: 4.2,
          w: 9.33,
          h: 0.8,
          fontSize: 20,
          fontFace: 'Arial',
          color: contrast,
          align: 'center',
        });
      }

      // Brand name at bottom
      slide.addText(brand.name, {
        x: 0.5,
        y: 6.8,
        w: 12.33,
        h: 0.4,
        fontSize: 12,
        fontFace: 'Arial',
        color: contrast,
        align: 'center',
      });
    } else {
      // Content slide — white bg
      slide.background = { fill: 'FFFFFF' };

      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: '100%',
        h: 0.15,
        fill: { color: p },
      });

      // Title
      slide.addText(slideData.title, {
        x: 0.8,
        y: 0.5,
        w: 11.73,
        h: 1,
        fontSize: 32,
        fontFace: 'Arial',
        color: '212121',
        bold: true,
      });

      // Subtitle
      if (slideData.subtitle) {
        slide.addText(slideData.subtitle, {
          x: 0.8,
          y: 1.4,
          w: 11.73,
          h: 0.6,
          fontSize: 16,
          fontFace: 'Arial',
          color: '888888',
        });
      }

      // Body text
      if (slideData.body) {
        slide.addText(slideData.body, {
          x: 0.8,
          y: 2.2,
          w: 11.73,
          h: 4,
          fontSize: 14,
          fontFace: 'Arial',
          color: '444444',
          valign: 'top',
        });
      }

      // Footer
      slide.addText(brand.name, {
        x: 0.5,
        y: 7,
        w: 6,
        h: 0.3,
        fontSize: 9,
        fontFace: 'Arial',
        color: 'CCCCCC',
      });

      // Page number
      slide.addText(`${i + 1}`, {
        x: 12,
        y: 7,
        w: 1,
        h: 0.3,
        fontSize: 9,
        fontFace: 'Arial',
        color: 'CCCCCC',
        align: 'right',
      });
    }

    const progress = Math.round(((i + 1) / slides.length) * 85 + 10);
    onProgress?.(progress);
  }

  onProgress?.(95);
  const output = await pptx.write({ outputType: 'blob' });
  onProgress?.(100);

  return {
    blob: output as Blob,
    filename: `${filename}.pptx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
}

export type { PresentationSlide };
