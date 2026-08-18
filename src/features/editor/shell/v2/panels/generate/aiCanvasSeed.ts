// aiCanvasSeed — the blank document an image-generation entry point opens.
//
// Generation lives INSIDE the design editor, so "start generating" means
// "open a design". This is the smallest document that says so: one empty page
// at the requested aspect, and `metadata.ai.origin = 'ai-image'` so the editor
// opens its Generate rail on arrival and `pendingPrompt` is picked up as the
// first prompt.
//
// It is deliberately EMPTY. Generated images arrive as new full-bleed pages
// after the active one; seeding a branded layout here would leave a stray
// template page in front of every result.

import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import { findFormat } from './formats';
import { withAiMetadata } from './aiMetadata';

/** Longest edge of the starting canvas. The model decides the real pixels. */
const BASE = 1080;

/** Page size for a format id — square when the format is 'auto'. */
export function canvasSizeForFormat(formatId: string | undefined | null): { width: number; height: number } {
  const format = findFormat(formatId);
  if (format.ratio === 'auto') return { width: BASE, height: BASE };
  const [w, h] = format.ratio.split(':').map(Number);
  if (!w || !h) return { width: BASE, height: BASE };
  return w >= h
    ? { width: BASE, height: Math.round((BASE * h) / w) }
    : { width: Math.round((BASE * w) / h), height: BASE };
}

export function seedAiImageCanvas(
  brand: Brand,
  opts: { prompt?: string; formatId?: string } = {},
): BrandOSDocument {
  const { width, height } = canvasSizeForFormat(opts.formatId);
  const doc: BrandOSDocument = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    contentType: 'social-post',
    brandId: brand.id,
    masterPages: [],
    pages: [{
      id: crypto.randomUUID(),
      name: 'Canvas',
      width,
      height,
      background: '#ffffff',
      masterPageId: null,
      layers: [],
    }],
    metadata: {},
  };
  return withAiMetadata(doc, { origin: 'ai-image', pendingPrompt: opts.prompt || undefined });
}
