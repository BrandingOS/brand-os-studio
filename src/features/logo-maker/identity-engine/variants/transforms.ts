// Pure SVG transforms. Each function takes an SVG string and returns a new
// SVG string. No DOM APIs beyond DOMParser / XMLSerializer (both browser
// built-ins, no polyfill needed for Vite targets).
//
// Correctness goals:
//   1. Never throw on a malformed SVG — return the input unchanged.
//   2. Never rely on a specific attribute being present; inspect and act.
//   3. Preserve viewBox so downstream consumers scale predictably.

function parse(svg: string): Document | null {
  try {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    // DOMParser returns a parsererror document on failure.
    if (doc.querySelector('parsererror')) return null;
    return doc;
  } catch {
    return null;
  }
}

function serialize(doc: Document): string {
  return new XMLSerializer().serializeToString(doc);
}

/** Swap every `fill` and `stroke` that isn't `none` with the given color. */
export function monochrome(svg: string, color: string): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const all = doc.querySelectorAll('*');
  all.forEach((el) => {
    const fill = el.getAttribute('fill');
    if (fill && fill.toLowerCase() !== 'none') el.setAttribute('fill', color);
    const stroke = el.getAttribute('stroke');
    if (stroke && stroke.toLowerCase() !== 'none') el.setAttribute('stroke', color);
    // inline styles too
    const style = el.getAttribute('style');
    if (style) {
      el.setAttribute(
        'style',
        style
          .replace(/fill:\s*(?!none)[^;]+/gi, `fill:${color}`)
          .replace(/stroke:\s*(?!none)[^;]+/gi, `stroke:${color}`),
      );
    }
  });
  return serialize(doc);
}

/** Set root fill on the svg element itself (used for background). */
export function withBackground(svg: string, bgColor: string): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const root = doc.querySelector('svg');
  if (!root) return svg;

  const viewBox = root.getAttribute('viewBox');
  const [, , wStr, hStr] = (viewBox ?? `0 0 ${root.getAttribute('width') ?? 100} ${root.getAttribute('height') ?? 100}`).split(/\s+/);
  const w = Number(wStr) || 100;
  const h = Number(hStr) || 100;

  const rect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', '0');
  rect.setAttribute('y', '0');
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('fill', bgColor);
  root.insertBefore(rect, root.firstChild);
  return serialize(doc);
}

/** Apply global opacity to every visible element. Used for the watermark variant. */
export function withOpacity(svg: string, opacity: number): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const root = doc.querySelector('svg');
  if (!root) return svg;
  // Simplest, safest: wrap existing children in a g with opacity.
  const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('opacity', String(opacity));
  while (root.firstChild) g.appendChild(root.firstChild);
  root.appendChild(g);
  return serialize(doc);
}

/** Swap the two most-common colors in the SVG. Fallback: no-op if < 2 colors. */
export function invertPalette(svg: string): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const counts = new Map<string, number>();
  doc.querySelectorAll('*').forEach((el) => {
    const fill = el.getAttribute('fill');
    if (fill && fill !== 'none' && fill.startsWith('#')) {
      counts.set(fill, (counts.get(fill) ?? 0) + 1);
    }
  });
  const sorted = [...counts.entries()].sort(([, a], [, b]) => b - a);
  if (sorted.length < 2) return svg;
  const [a, b] = [sorted[0][0], sorted[1][0]];
  const swapped = parse(svg);
  if (!swapped) return svg;
  swapped.querySelectorAll('*').forEach((el) => {
    const fill = el.getAttribute('fill');
    if (fill === a) el.setAttribute('fill', `__SWAP__`);
    else if (fill === b) el.setAttribute('fill', a);
  });
  swapped.querySelectorAll('*').forEach((el) => {
    if (el.getAttribute('fill') === '__SWAP__') el.setAttribute('fill', b);
  });
  return serialize(swapped);
}

/**
 * Return only the named subtree (by Fabric object name attribute or id).
 * Falls back to the full SVG when the group isn't findable.
 */
export function isolateGroup(svg: string, groupName: string): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const root = doc.querySelector('svg');
  if (!root) return svg;
  const match =
    doc.querySelector(`[id="${cssEscape(groupName)}"]`) ??
    doc.querySelector(`[data-name="${cssEscape(groupName)}"]`);
  if (!match) return svg;

  // Preserve the root svg shell (viewBox + defs) and replace its contents
  // with only the matched subtree.
  const defs = root.querySelector('defs');
  while (root.firstChild) root.removeChild(root.firstChild);
  if (defs) root.appendChild(defs);
  root.appendChild(match);
  return serialize(doc);
}

/**
 * Replace the wordmark text with the brand's initials and return it in the
 * original wordmark position. If no wordmark group is tagged, we render a
 * new plain-text monogram at center.
 */
export function monogramFromBrandName(svg: string, brandName: string, primaryColor: string): string {
  const initials = brandName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

  const doc = parse(svg);
  if (!doc) return svg;
  const root = doc.querySelector('svg');
  if (!root) return svg;
  const [, , wStr, hStr] = (root.getAttribute('viewBox') ?? '0 0 400 400').split(/\s+/);
  const w = Number(wStr) || 400;
  const h = Number(hStr) || 400;

  const text = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', String(w / 2));
  text.setAttribute('y', String(h / 2));
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('fill', primaryColor);
  text.setAttribute('font-family', 'Space Grotesk, Inter, sans-serif');
  text.setAttribute('font-weight', '700');
  text.setAttribute('font-size', String(Math.min(w, h) * 0.5));
  text.textContent = initials;

  while (root.firstChild) root.removeChild(root.firstChild);
  root.appendChild(text);
  return serialize(doc);
}

/** Drop elements whose on-screen area at a target size falls below `minPx²`. */
export function dropSmallDetails(svg: string, targetSize: number, minPx: number): string {
  const doc = parse(svg);
  if (!doc) return svg;
  const root = doc.querySelector('svg');
  if (!root) return svg;
  const [, , wStr, hStr] = (root.getAttribute('viewBox') ?? '0 0 400 400').split(/\s+/);
  const w = Number(wStr) || 400;
  const scale = targetSize / Math.max(w, Number(hStr) || 400);
  const minArea = minPx * minPx;

  const candidates = root.querySelectorAll('path, rect, circle, ellipse, polygon, line');
  candidates.forEach((el) => {
    // Rough area heuristic per shape type — not a true bbox.
    let approxArea = 0;
    if (el.tagName === 'rect') {
      approxArea = Number(el.getAttribute('width') ?? 0) * Number(el.getAttribute('height') ?? 0);
    } else if (el.tagName === 'circle') {
      const r = Number(el.getAttribute('r') ?? 0);
      approxArea = Math.PI * r * r;
    } else if (el.tagName === 'ellipse') {
      const rx = Number(el.getAttribute('rx') ?? 0);
      const ry = Number(el.getAttribute('ry') ?? 0);
      approxArea = Math.PI * rx * ry;
    } else {
      // paths/polygons: skip, too expensive to compute without canvas
      return;
    }
    if (approxArea * scale * scale < minArea) {
      el.parentNode?.removeChild(el);
    }
  });

  return serialize(doc);
}

function cssEscape(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, '_');
}
