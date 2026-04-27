/**
 * Export pipeline for the case-study deck.
 *
 * Captures each 1920×1080 slide with html2canvas and bundles them into the
 * requested format. Reuses html2canvas + jsPDF + jszip which are already
 * in the project's deps (see package.json).
 *
 * Targets: PDF (multi-page landscape), PNG zip, single-slide PNG.
 */

import { SLIDE_HEIGHT, SLIDE_WIDTH } from './constants';

export type ExportFormat = 'pdf' | 'png-zip';

export interface ExportOptions {
  format: ExportFormat;
  fileName: string;
  /** 1 = native 1920, 2 = retina. */
  scale?: number;
  /** Optional progress callback (0..1). */
  onProgress?: (ratio: number) => void;
  /**
   * CSS selector for slide-frame elements within the container.
   * Defaults to the case-study attribute; pitch-deck callers should
   * pass `'[data-pitch-slide]'`. Multiple comma-separated selectors
   * are supported when a deck mixes both.
   */
  slideSelector?: string;
}

/**
 * Given a container DOM element that holds all slide frames matched
 * by `slideSelector` (default `[data-case-study-slide]`), render each
 * to a canvas, then bundle.
 *
 * Slides hidden (`style.display==='none'`) or marked `data-hidden="true"`
 * are skipped.
 */
export async function exportDeck(container: HTMLElement, opts: ExportOptions): Promise<void> {
  const { format, fileName, scale = 2, onProgress, slideSelector = '[data-case-study-slide]' } = opts;
  const slideEls = Array.from(container.querySelectorAll<HTMLElement>(slideSelector))
    .filter((el) => el.dataset.hidden !== 'true' && el.offsetParent !== null);

  if (slideEls.length === 0) {
    throw new Error('No slides to export.');
  }

  // html-to-image renders into an SVG <foreignObject> and lets the
  // BROWSER do the layout + text shaping. That preserves Arabic
  // ligatures, RTL bidi, font features, and ::before/::after content
  // — all of which html2canvas mangles because it walks the DOM
  // and re-paints glyph-by-glyph.
  const { toCanvas } = await import('html-to-image');

  // Make sure all webfonts are loaded before we start capturing —
  // otherwise the browser falls back to a system font for the SVG
  // render and Arabic glyphs may visibly shift.
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try { await document.fonts.ready; } catch { /* non-fatal */ }
  }

  // Capture each slide at native 1920×1080, at retina `scale`.
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < slideEls.length; i++) {
    const el = slideEls[i];
    // Temporarily strip CSS transforms so the capture lands at
    // natural 1920×1080 instead of the on-screen scaled size.
    const prevTransform = el.style.transform;
    el.style.transform = 'none';
    // Strip every descendant's inline box-shadow before capture.
    // html-to-image renders via SVG foreignObject; the browser's
    // SVG-side handling of box-shadow drifts (offset/blur amplified,
    // sometimes turning into a colored aura that misses the parent's
    // overflow:hidden clip). Restoring the values after toCanvas keeps
    // the live preview exactly as the user authored it.
    const shadowSnapshot = stripBoxShadows(el);
    try {
      const canvas = await toCanvas(el, {
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        pixelRatio: scale,
        cacheBust: true,
        // Skip resize-handle overlays etc. so they don't pollute the export.
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          if (node.classList?.contains('resize-handle')) return false;
          if (node.dataset?.editorChrome === 'true') return false;
          return true;
        },
      });
      canvases.push(canvas);
    } finally {
      el.style.transform = prevTransform;
      restoreBoxShadows(shadowSnapshot);
    }
    onProgress?.((i + 1) / (slideEls.length + 1));
  }

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [SLIDE_WIDTH, SLIDE_HEIGHT],
      compress: true,
    });
    for (let i = 0; i < canvases.length; i++) {
      if (i > 0) pdf.addPage([SLIDE_WIDTH, SLIDE_HEIGHT], 'landscape');
      const dataUrl = canvases[i].toDataURL('image/jpeg', 0.92);
      pdf.addImage(dataUrl, 'JPEG', 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT, undefined, 'FAST');
    }
    pdf.save(`${fileName}.pdf`);
    onProgress?.(1);
    return;
  }

  if (format === 'png-zip') {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (let i = 0; i < canvases.length; i++) {
      const blob = await canvasToBlob(canvases[i]);
      zip.file(`${String(i + 1).padStart(2, '0')}.png`, blob);
    }
    const bundle = await zip.generateAsync({ type: 'blob' });
    triggerDownload(bundle, `${fileName}.zip`);
    onProgress?.(1);
    return;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas blob failed'))), 'image/png');
  });
}

/**
 * Walk the slide subtree, capture every element's inline box-shadow,
 * and clear it. Returns a snapshot we can use to restore the values
 * after the export capture is done.
 *
 * Why: html-to-image's SVG-foreignObject path drifts on box-shadow
 * (the colored aura we see far off to the side of round elements).
 * Clearing inline shadows during capture gives a clean export; the
 * live preview is unaffected because we restore.
 */
function stripBoxShadows(root: HTMLElement): Array<{ el: HTMLElement; value: string }> {
  const snapshot: Array<{ el: HTMLElement; value: string }> = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let cur: Node | null = root;
  while (cur) {
    if (cur instanceof HTMLElement) {
      const v = cur.style.boxShadow;
      if (v) {
        snapshot.push({ el: cur, value: v });
        cur.style.boxShadow = 'none';
      }
    }
    cur = walker.nextNode();
  }
  return snapshot;
}

function restoreBoxShadows(snapshot: Array<{ el: HTMLElement; value: string }>) {
  for (const { el, value } of snapshot) {
    el.style.boxShadow = value;
  }
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
