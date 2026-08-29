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

/**
 * The one-time cushion, paid once per session rather than per snapshot.
 *
 * Web fonts arriving mid-capture were the reason for a fixed wait, and
 * that reason is real — but it is a startup cost, not a per-unit one. A
 * 24-deliverable export was spending six seconds of pure `setTimeout`
 * doing nothing, which is most of what made an export feel like a freeze.
 * `document.fonts.ready` is still awaited before EVERY capture: it is an
 * already-resolved promise when nothing is pending, and re-pends by
 * itself if a template pulls in a face nothing has loaded yet.
 */
const FIRST_PAINT_CUSHION_MS = 250;
let primed: Promise<void> | null = null;

/** Pay the font/layout cushion once. Safe to call as often as you like. */
export function primeRenderEnvironment(): Promise<void> {
  primed ??= (async () => {
    try {
      await document.fonts.ready;
    } catch {
      // Older engines — proceed anyway.
    }
    await new Promise((r) => setTimeout(r, FIRST_PAINT_CUSHION_MS));
  })();
  return primed;
}

/** Test seam: forget that the cushion was paid. */
export function resetRenderEnvironment(): void {
  primed = null;
}

/** Wait until fonts are ready and the browser has painted twice. */
async function settleRender(): Promise<void> {
  await primeRenderEnvironment();
  try {
    await document.fonts.ready;
  } catch {
    // Older engines — proceed anyway.
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
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

/** Mount an element offscreen, hand the live host to `fn`, clean up. */
async function withOffscreenHost<T>(
  element: ReactElement,
  style: Partial<CSSStyleDeclaration>,
  fn: (host: HTMLElement) => Promise<T>,
  autoHeight = false,
): Promise<T> {
  const host = document.createElement('div');
  host.className = autoHeight ? 'bk-snapshot-host bk-snapshot-host--auto' : 'bk-snapshot-host';
  // THE HOST IS PART OF THE WORKSPACE, even though it hangs off <body>.
  //
  // Nearly every rule the Brand Kit's own markup depends on is written
  // `[data-workspace] .bk-…`, so a host mounted outside that wrapper gets
  // none of them: the system views' example frames lose `position:
  // absolute; inset: 0`, collapse to zero height, and html2canvas dies
  // parsing a gradient on a 0×0 box ("addColorStop … non-finite"). What
  // survived that was a picture of unstyled text — an export that looked
  // like it worked. Same family as the Radix-portal gotcha in CLAUDE.md:
  // scoped CSS does not follow the element, it follows the ancestor.
  //
  // The theme is pinned LIGHT: an export is a document someone sends on,
  // and it should not arrive dark because of how the author's screen was
  // set at the moment they pressed the button.
  host.setAttribute('data-workspace', '');
  host.setAttribute('data-theme', 'light');
  // `[data-workspace]` also carries `min-height: 100vh` (workspace.css) so
  // the shell fills the window. On a snapshot host that made EVERY export a
  // viewport-tall canvas with the artwork in a thin band — 1040×3600 for a
  // business card. The attribute is wanted for the tokens and scoped rules;
  // the height is not.
  host.style.minHeight = '0';
  Object.assign(host.style, style);
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    root.render(element);
    await settleRender();
    return await fn(host);
  } finally {
    root.unmount();
    host.remove();
  }
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
  return withOffscreenHost(
    element,
    { width: `${width}px`, height: `${height}px` },
    (host) => snapshotElementPng(host, scale),
  );
}

/**
 * Snapshot a PAGE BODY rather than a card.
 *
 * The composed views — the Social and Presentation systems — are not
 * 260px tiles with a fixed ratio; they are documents that lay themselves
 * out to a column width and end wherever they end. Forcing them into an
 * aspect crops the bottom off the export, so this mounts at a real page
 * width, lets the height fall out of the content, and captures all of it.
 */
export async function snapshotDocumentPng(
  element: ReactElement,
  width = 1120,
  scale = 2,
): Promise<Blob | null> {
  return withOffscreenHost(
    element,
    { width: `${width}px`, height: 'auto' },
    (host) => snapshotElementPng(host, scale),
    true,
  );
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
      host.setAttribute('data-workspace', '');
      host.setAttribute('data-theme', 'light');
      host.style.minHeight = '0';
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
