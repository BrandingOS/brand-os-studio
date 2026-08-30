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

/**
 * THE 1×1 GIF html2canvas MEASURES EVERY BASELINE WITH.
 *
 * `FontMetrics.parseMetrics` (html2canvas 1.4.1) works out where a font sits in
 * its line box by putting a span of sample text and this 1-pixel image side by
 * side, giving the image `vertical-align: baseline`, and reading
 * `img.offsetTop - span.offsetTop`. Every glyph in every export is then painted
 * at `bounds.top + baseline`.
 *
 * Tailwind's preflight sets `img { display: block }`. A BLOCK image is not
 * beside the span, it is UNDER it — so the measurement stopped being "where is
 * the baseline" and became "how tall is a line", which is roughly twice as far
 * down. Measured in this app: 5.5px type reported a baseline of 9 instead of
 * ~5.5, 16px reported 24 instead of ~16, 48px reported 68 instead of ~47.
 *
 * Every line of text in every PNG the kit exported was therefore drawn about a
 * full line too low, and whatever box contained it clipped the overshoot: a
 * one-line label came out as its own top half, a two-line block kept the first
 * line and half of the second, a card's bottom row was a row of stripes. The
 * screen was always right, because no browser draws text this way — only the
 * rasterizer did (QA Q2).
 *
 * The probe is created in the LIVE document (`new FontMetrics(document)`, not
 * the clone), so a rule in this page's own stylesheet reaches it. Matching the
 * exact data URI keeps the override on html2canvas's ruler and off every other
 * image on the page.
 */
const H2C_METRIC_PROBE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

let probeRuleInstalled = false;

/** Give html2canvas back its ruler. Idempotent; safe to call per capture. */
export function keepFontMetricsHonest(): void {
  if (probeRuleInstalled || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.setAttribute('data-h2c-font-metrics', '');
  style.textContent =
    `img[src="${H2C_METRIC_PROBE}"]{display:inline!important;vertical-align:baseline!important;}`;
  document.head.appendChild(style);
  probeRuleInstalled = true;
}

/** Pay the font/layout cushion once. Safe to call as often as you like. */
export function primeRenderEnvironment(): Promise<void> {
  primed ??= (async () => {
    keepFontMetricsHonest();
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

/**
 * BAKE EVERY PICTURE INTO ONE html2canvas CAN ACTUALLY DRAW.
 *
 * `CanvasRenderer.renderReplacedElement` draws an image with the NINE-argument
 * `drawImage(img, 0, 0, naturalWidth, naturalHeight, box.left, box.top,
 * box.width, box.height)`. Two things follow, and both were visible in every
 * export (QA Q3):
 *
 *  • **`object-fit` does not exist.** The picture is stretched to the box,
 *    whatever the CSS says. SKAM's circular mark came out as a 2.4∶1 ellipse on
 *    the red panel and stayed round on the black card only because that box
 *    happened to be square — the kit breaking its own "never stretch the logo"
 *    rule inside its own export.
 *
 *  • **A source rect and an SVG with no intrinsic size do not mix.** Every logo
 *    here is `viewBox`-only, so Chrome resolves it to a default 300px-wide box
 *    for `naturalWidth` and then rasterises it against the DESTINATION for the
 *    draw — the source rectangle addresses a different coordinate space than the
 *    one it was measured in, and what lands is a magnified corner. The RAQM
 *    wordmark exported as a white slab and a loose triangle: the "R" and half an
 *    "A", blown up. CLAUDE.md already records the same family of bug in the
 *    onboarding artwork reader ("Chrome draws NOTHING when an SVG with no
 *    intrinsic size is cropped by `drawImage`'s source-rect form").
 *
 * So each picture is redrawn HERE, at its own box size, with the five-argument
 * form (no source rect) and the letterboxing `object-fit` asks for already baked
 * in, and handed back as a PNG. html2canvas then stretches a picture that is
 * already exactly the right shape, which is the identity.
 *
 * It runs on the CLONE (html2canvas's `onclone`, which is awaited before the
 * tree is parsed), never on the page: `snapshotElementPng` is also pointed at
 * the card editor's LIVE preview, and rewriting the user's DOM to take a picture
 * of it is not a trade worth making.
 *
 * The decode is awaited. `parseTree` reads `naturalWidth` synchronously and
 * skips anything still at 0, so handing it a `data:` URL that has not decoded
 * yet would replace a wrong logo with no logo at all.
 */
/**
 * AN INLINE `<svg>` IS SERIALIZED WITH THE STYLE THAT PLACED IT ON THE PAGE.
 *
 * `SVGElementContainer` turns every inline `<svg>` into a standalone image:
 * `XMLSerializer` → `data:image/svg+xml,…`. What it does not do is take the
 * element's `style` attribute off first — so a drawing positioned in the SCENE,
 * as every part of a mockup is
 * (`style="position:absolute; inset:35.6% auto auto 62%; width:16.8%; height:24.96%"`),
 * arrives inside its own one-part document still carrying those instructions.
 * There the percentages resolve against that document's own viewport: the root
 * is pushed 62% right and 35.6% down and shrunk to a sixth, and the drawing is
 * painted almost entirely outside the picture it IS. Rendered on magenta, the
 * mug's handle is a nub in the far corner and nothing else.
 *
 * That is why the exported mug had no handle and no rim while the same scene's
 * washes came through: a full-bleed `inset: 0; width: 100%` is the one style
 * that happens to mean the same thing in both documents (QA Q3).
 *
 * The fix keeps the layout and moves it off the drawing: the placement style
 * goes onto a wrapper, and the `<svg>` fills that wrapper. The box does not
 * move — which is checked, and the change is REVERTED if it does, because a
 * displaced part is worse than a flat one.
 */
function liftInlineSvgLayout(root: HTMLElement): void {
  const doc = root.ownerDocument;
  if (!doc) return;
  const svgs = Array.from(root.querySelectorAll('svg'));
  for (const svg of svgs) {
    const placement = svg.getAttribute('style');
    // Only a style that can MOVE or RESIZE the root is a problem. A drawing
    // with no inline style serializes to exactly itself.
    if (!placement || !/(?:^|[;\s])(?:position|inset|top|right|bottom|left|width|height|margin|transform)\s*:/i.test(placement)) {
      continue;
    }
    const before = svg.getBoundingClientRect();
    const parent = svg.parentNode;
    if (!parent) continue;
    // A nested `<svg>` is inside SVG content, where a `<span>` is not markup.
    // Only the OUTERMOST drawing is ever serialized on its own anyway.
    if ((parent as Element).namespaceURI === 'http://www.w3.org/2000/svg') continue;

    const wrapper = doc.createElement('span');
    wrapper.setAttribute('style', placement);
    wrapper.style.display = 'block';
    parent.insertBefore(wrapper, svg);
    wrapper.appendChild(svg);
    svg.setAttribute('style', 'display:block;width:100%;height:100%');

    const after = svg.getBoundingClientRect();
    const moved =
      Math.abs(after.left - before.left) > 0.5 ||
      Math.abs(after.top - before.top) > 0.5 ||
      Math.abs(after.width - before.width) > 0.5 ||
      Math.abs(after.height - before.height) > 0.5;
    if (moved) {
      svg.setAttribute('style', placement);
      parent.insertBefore(svg, wrapper);
      wrapper.remove();
    }
  }
}

async function flattenPicturesForCapture(root: HTMLElement, scale: number): Promise<void> {
  liftInlineSvgLayout(root);
  const targets: HTMLImageElement[] = [];
  if (root instanceof HTMLImageElement) targets.push(root);
  root.querySelectorAll('img').forEach((img) => targets.push(img as HTMLImageElement));
  await Promise.all(targets.map((img) => flattenOnePicture(img, scale)));
}

async function flattenOnePicture(img: HTMLImageElement, scale: number): Promise<void> {
  const view = img.ownerDocument?.defaultView;
  if (!view) return;
  const src = img.currentSrc || img.src;
  if (!src) return;

  const cs = view.getComputedStyle(img);
  const fit = cs.objectFit || 'fill';
  const isSvg = /\.svg(?:[?#]|$)/i.test(src) || /^data:image\/svg/i.test(src);
  // A raster already told to fill its box is drawn correctly as it is; leaving
  // it alone keeps the common case free.
  if (!isSvg && fit === 'fill') return;

  const rect = img.getBoundingClientRect();
  const inset = (a: string, b: string, c: string, d: string) =>
    (parseFloat(cs.getPropertyValue(a)) || 0) +
    (parseFloat(cs.getPropertyValue(b)) || 0) +
    (parseFloat(cs.getPropertyValue(c)) || 0) +
    (parseFloat(cs.getPropertyValue(d)) || 0);
  const w = rect.width - inset('padding-left', 'padding-right', 'border-left-width', 'border-right-width');
  const h = rect.height - inset('padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width');
  if (!(w > 0.5) || !(h > 0.5)) return;

  try {
    const source = new Image();
    source.crossOrigin = 'anonymous';
    source.src = src;
    await source.decode();

    // A viewBox-only SVG has no intrinsic size of its own; Chrome's default box
    // still carries the drawing's ASPECT, which is all the fit maths needs.
    const nw = source.naturalWidth || w;
    const nh = source.naturalHeight || h;
    const { dx, dy, dw, dh } = fitBox(fit, w, h, nw, nh);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(scale, scale);
    // FIVE arguments. The source rect is the whole bug.
    ctx.drawImage(source, dx, dy, dw, dh);

    img.removeAttribute('srcset');
    img.removeAttribute('sizes');
    img.src = canvas.toDataURL('image/png');
    // The letterboxing is in the pixels now, so the stretch is a no-op.
    img.style.objectFit = 'fill';
    await img.decode().catch(() => undefined);
  } catch {
    // A tainted canvas or an image that will not decode: leave the original in
    // place. A stretched logo is a defect; a missing one is a worse defect.
  }
}

/** Where `object-fit` puts a `nw × nh` drawing inside a `w × h` box. */
function fitBox(
  fit: string,
  w: number,
  h: number,
  nw: number,
  nh: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const aspect = nw / nh;
  let dw = w;
  let dh = h;
  if (fit === 'contain' || fit === 'scale-down') {
    if (w / h > aspect) {
      dh = h;
      dw = h * aspect;
    } else {
      dw = w;
      dh = w / aspect;
    }
    if (fit === 'scale-down' && nw < dw) {
      dw = nw;
      dh = nh;
    }
  } else if (fit === 'cover') {
    if (w / h > aspect) {
      dw = w;
      dh = w / aspect;
    } else {
      dh = h;
      dw = h * aspect;
    }
  } else if (fit === 'none') {
    dw = nw;
    dh = nh;
  }
  return { dx: (w - dw) / 2, dy: (h - dh) / 2, dw, dh };
}

/**
 * BAKE THE FRAME THE LIVE ELEMENT IS SHOWING INTO THE CLONE.
 *
 * html2canvas parses a COPY of the tree in its own iframe, and a CSS
 * animation in that copy is a new animation: it has its own start time and
 * its own layout, so a frame chosen on the page is not the frame that gets
 * drawn. Measured, on the animation storyboard (QA Q11): a sweeping bar
 * sitting at x = −48.6px on the page rasterised at x = +235px, and two of
 * the four frames lost it off the right edge entirely.
 *
 * Percentage transforms are the worst of it — `translateX(-180%)` resolves
 * against the element's own width, and the clone resolves it against a
 * different one — which is why this copies the RESOLVED values across:
 * `getComputedStyle` on the live node returns a pixel matrix, an opacity
 * and a clip path for the exact instant being captured. The animation is
 * then turned off in the clone, so nothing can re-run and disagree.
 *
 * Structural equality is checked rather than assumed: if the two trees do
 * not have the same node count the mapping is meaningless and this does
 * nothing at all, which leaves the capture exactly as it was before.
 */
function freezeAnimationsForCapture(live: HTMLElement, clone: HTMLElement): void {
  const liveNodes = [live, ...Array.from(live.querySelectorAll<HTMLElement>('*'))];
  const cloneNodes = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))];
  if (liveNodes.length !== cloneNodes.length) return;
  for (let i = 0; i < liveNodes.length; i += 1) {
    const source = liveNodes[i];
    const target = cloneNodes[i];
    if (!source || !target || typeof target.style === 'undefined') continue;
    const computed = getComputedStyle(source);
    if (!computed.animationName || computed.animationName === 'none') continue;
    target.style.animation = 'none';
    if (computed.transform && computed.transform !== 'none') {
      target.style.transform = computed.transform;
    }
    if (computed.opacity) target.style.opacity = computed.opacity;
    if (computed.clipPath && computed.clipPath !== 'none') {
      target.style.clipPath = computed.clipPath;
    }
    if (computed.filter && computed.filter !== 'none') target.style.filter = computed.filter;
  }
}

/** Rasterize an already-mounted element to a PNG blob. */
export async function snapshotElementPng(
  element: HTMLElement,
  scale = 2,
): Promise<Blob | null> {
  keepFontMetricsHonest();
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    onclone: (_doc, cloned) => {
      // Freezing runs FIRST: it maps the two trees by position, and
      // flattening rewrites nodes in the clone.
      freezeAnimationsForCapture(element, cloned as HTMLElement);
      return flattenPicturesForCapture(cloned as HTMLElement, scale);
    },
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
