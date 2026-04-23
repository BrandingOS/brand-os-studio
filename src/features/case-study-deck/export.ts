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
}

/**
 * Given a container DOM element that holds all slide frames with
 * `[data-case-study-slide]` attributes, render each to a canvas, then bundle.
 *
 * Slides hidden (`style.display==='none'`) or marked `data-hidden="true"`
 * are skipped.
 */
export async function exportDeck(container: HTMLElement, opts: ExportOptions): Promise<void> {
  const { format, fileName, scale = 2, onProgress } = opts;
  const slideEls = Array.from(container.querySelectorAll<HTMLElement>('[data-case-study-slide]'))
    .filter((el) => el.dataset.hidden !== 'true' && el.offsetParent !== null);

  if (slideEls.length === 0) {
    throw new Error('No slides to export.');
  }

  const { default: html2canvas } = await import('html2canvas');

  // Capture each slide at native 1920×1080, at retina `scale`.
  const canvases: HTMLCanvasElement[] = [];
  for (let i = 0; i < slideEls.length; i++) {
    const el = slideEls[i];
    // Temporarily strip CSS transforms so html2canvas captures at natural size.
    const prevTransform = el.style.transform;
    el.style.transform = 'none';
    const canvas = await html2canvas(el, {
      width: SLIDE_WIDTH,
      height: SLIDE_HEIGHT,
      scale,
      backgroundColor: null,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });
    el.style.transform = prevTransform;
    canvases.push(canvas);
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
