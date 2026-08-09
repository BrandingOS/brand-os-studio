/**
 * Offscreen template rasterization (KIT-02/KIT-03).
 *
 * Renders a Brand Kit template (the same React element the drilldown
 * tiles paint) into a hidden container, snapshots it with html2canvas,
 * and returns a PNG blob. Also snapshots already-live DOM (the card
 * editor's preview host) so a customized preview exports exactly what
 * the user sees.
 */
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';

/** Wait until fonts are ready and the browser has painted twice. */
async function settleRender(extraMs = 250): Promise<void> {
  try {
    await document.fonts.ready;
  } catch {
    // Older engines — proceed anyway.
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, extraMs));
}

/** Rasterize an already-mounted element to a PNG blob. */
export async function snapshotElementPng(
  element: HTMLElement,
  scale = 2,
): Promise<Blob | null> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });
  return new Promise<Blob | null>((r) => canvas.toBlob((b) => r(b), 'image/png'));
}

/**
 * Render a template element offscreen at an explicit size and snapshot
 * it. The mount reproduces the drilldown tile contract: the renderer's
 * root stretches to 100% × 100% of the host (see `.bk-snapshot-host`
 * in brand-kit.css).
 *
 * Renderers in this codebase use absolute pixel sizes designed for a
 * ~260px-wide drilldown card (see ScalingStage) — so mount at that
 * canonical width and let html2canvas's scale factor deliver the
 * resolution (scale 4 → ~1040px-wide PNG).
 */
export async function snapshotTemplatePng(
  element: ReactElement,
  width = 260,
  aspect = 1.6,
  scale = 4,
): Promise<Blob | null> {
  const height = Math.round(width / aspect);
  const host = document.createElement('div');
  host.className = 'bk-snapshot-host';
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(element);
    await settleRender();
    return await snapshotElementPng(host, scale);
  } finally {
    root.unmount();
    host.remove();
  }
}

/**
 * Mount several elements offscreen at a fixed tile size, hand the live
 * host nodes to `fn` (e.g. the icon exporter, which reads computed
 * glyph styles), then clean everything up.
 */
export async function withOffscreenMounts<T>(
  elements: ReactElement[],
  width: number,
  height: number,
  fn: (hosts: HTMLElement[]) => Promise<T>,
): Promise<T> {
  const hosts: HTMLElement[] = [];
  const roots: Array<ReturnType<typeof createRoot>> = [];
  try {
    for (const el of elements) {
      const host = document.createElement('div');
      host.className = 'bk-snapshot-host';
      host.style.width = `${width}px`;
      host.style.height = `${height}px`;
      document.body.appendChild(host);
      const root = createRoot(host);
      root.render(el);
      hosts.push(host);
      roots.push(root);
    }
    await settleRender();
    return await fn(hosts);
  } finally {
    roots.forEach((r) => r.unmount());
    hosts.forEach((h) => h.remove());
  }
}
