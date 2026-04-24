/**
 * Export pipeline — off-screen PixiJS application re-renders at the
 * target resolution, reads pixels, and produces a Blob the caller can
 * download or upload.
 *
 * V1 ships PNG 1x / 2x. 4x print export + text baking follow once the
 * text layer UI lands — the function accepts any integer scale so it's
 * future-proof today.
 */

import { MockupRenderer } from './MockupRenderer';
import type { MockupState, TemplateMeta } from './types';

export type ExportScale = 1 | 2 | 4;

export interface ExportOptions {
  scale?: ExportScale;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export async function exportMockup(
  template: TemplateMeta,
  state: MockupState,
  opts: ExportOptions = {},
): Promise<Blob> {
  const scale = opts.scale ?? 1;
  const format = opts.format ?? 'png';
  const width = template.canvas.width * scale;
  const height = template.canvas.height * scale;

  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;

  const renderer = new MockupRenderer();
  try {
    await renderer.init(offscreenCanvas, { width, height });
    await renderer.setTemplate(template);
    await renderer.applyState(state);
    // One frame for the ticker to flush.
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) =>
      offscreenCanvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
        mime,
        opts.quality ?? 0.92,
      ),
    );
    return blob;
  } finally {
    renderer.destroy();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on next tick so the browser has time to kick off the download.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
