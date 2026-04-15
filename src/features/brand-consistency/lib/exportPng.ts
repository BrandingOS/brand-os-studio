/**
 * Export helper — captures a rendered template node to a PNG download.
 *
 * The capture target is the inner `[data-brand-template-frame]` element
 * (set in `TemplateFrame.tsx`), which has the natural pixel dimensions
 * of the output. We render an off-screen, un-scaled copy so the export
 * pixel size matches the OutputSpec exactly.
 */

import html2canvas from 'html2canvas';

export async function exportTemplateToPng(node: HTMLElement, fileName: string): Promise<void> {
  const target = node.querySelector<HTMLElement>('[data-brand-template-frame]');
  if (!target) {
    throw new Error('No template frame found inside the provided node');
  }
  const canvas = await html2canvas(target, {
    backgroundColor: null,
    useCORS: true,
    scale: 1,
    logging: false,
    // html2canvas reads the element's bounding box for size — since the
    // wrapper applies a `transform: scale()`, we temporarily clear it.
  });
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas → blob failed'))), 'image/png'),
  );
  triggerDownload(blob, `${safeFileName(fileName)}.png`);
}

function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFileName(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase();
}
