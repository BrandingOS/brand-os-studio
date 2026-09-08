/**
 * =============================================================================
 * SVG import
 * =============================================================================
 *
 * Turns SVG text into the engine's `Component[]`, plus a list of everything the
 * file contains that this pipeline will not honour.
 *
 * It lives under `render/` rather than `engine/` for one concrete reason:
 * parsing SVG needs a DOM. `DOMParser` is undefined in Node, so an importer in
 * the pure layer would make the whole engine untestable outside a browser and
 * unusable inside a plain Worker. The engine consumes rings of numbers; getting
 * from a file to those rings is a browser job.
 *
 * Three.js's `SVGLoader` does the parsing — transforms, nested groups, the
 * basic shapes, styles, units — but its shape/hole resolution is deliberately
 * *not* used. Hole classification here goes through the engine's own
 * `classifyRings`, so the fill rule the file declares is the one that decides,
 * and one model of "what is solid" holds from import all the way to export.
 */

import type { Component, FillRule, Ring } from '../engine/types';

/** Everything the importer noticed that the user needs told about. */
export type ImportDiagnostic =
  | { code: 'live-text'; count: number }
  | { code: 'raster-image'; count: number }
  | { code: 'unsupported-paint'; kind: 'mask' | 'filter' | 'pattern' | 'clip-path'; count: number }
  | { code: 'external-reference'; count: number; samples: string[] }
  | { code: 'script-removed'; count: number }
  | { code: 'event-handler-removed'; count: number }
  | { code: 'stroke-not-outlined'; count: number }
  | { code: 'background-rect-skipped' }
  | { code: 'degenerate-path'; count: number }
  | { code: 'too-complex'; points: number; limit: number }
  | { code: 'no-fillable-geometry' }
  | { code: 'parse-failed'; message: string };

export interface ImportResult {
  components: Component[];
  diagnostics: ImportDiagnostic[];
  /** The file exactly as supplied. Reset and "compare with source" both need it. */
  source: string;
  viewBox: { x: number; y: number; width: number; height: number } | null;
}

export interface ImportOptions {
  /** Points per curve segment. Higher is rounder and heavier. */
  curveDivisions?: number;
  /** Refuse anything past this many points, rather than hanging the tab. */
  maxPoints?: number;
  /** Full-artboard rectangles are export artefacts far more often than art. */
  skipBackgroundRect?: boolean;
}

const DEFAULTS: Required<ImportOptions> = {
  curveDivisions: 24,
  maxPoints: 400_000,
  skipBackgroundRect: true,
};

/** Elements that carry meaning this pipeline cannot express. */
const UNSUPPORTED_PAINT = ['mask', 'filter', 'pattern', 'clipPath'] as const;

export async function importSvg(source: string, options: ImportOptions = {}): Promise<ImportResult> {
  const opt = { ...DEFAULTS, ...options };
  const diagnostics: ImportDiagnostic[] = [];
  const empty = (extra?: ImportDiagnostic): ImportResult => ({
    components: [],
    diagnostics: extra ? [...diagnostics, extra] : diagnostics,
    source,
    viewBox: null,
  });

  // ---- inspect and sanitize before anything renders --------------------
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  } catch (err) {
    return empty({ code: 'parse-failed', message: err instanceof Error ? err.message : String(err) });
  }
  if (doc.querySelector('parsererror') || !doc.documentElement || doc.documentElement.nodeName === 'html') {
    return empty({ code: 'parse-failed', message: 'The file is not valid SVG.' });
  }

  const scripts = doc.querySelectorAll('script');
  if (scripts.length > 0) diagnostics.push({ code: 'script-removed', count: scripts.length });
  let handlers = 0;
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) handlers++;
    }
  }
  if (handlers > 0) diagnostics.push({ code: 'event-handler-removed', count: handlers });

  const texts = doc.querySelectorAll('text, tspan, textPath');
  if (texts.length > 0) diagnostics.push({ code: 'live-text', count: doc.querySelectorAll('text').length || texts.length });
  const images = doc.querySelectorAll('image');
  if (images.length > 0) diagnostics.push({ code: 'raster-image', count: images.length });
  for (const kind of UNSUPPORTED_PAINT) {
    const found = doc.getElementsByTagName(kind).length;
    if (found > 0) {
      diagnostics.push({ code: 'unsupported-paint', kind: kind === 'clipPath' ? 'clip-path' : kind, count: found });
    }
  }

  // An external reference is anything that would make the render depend on the
  // network — which the PRD forbids outright, so these are reported, never
  // fetched. Only attributes that actually *load* something count: a namespace
  // declaration is a URL that is never dereferenced, and flagging `xmlns` made
  // every single SVG ever written look like it phoned home.
  const external: string[] = [];
  const LOADING_ATTRS = /^(href|src|xlink:href)$/i;
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      const v = attr.value.trim();
      const remote = /^(https?:)?\/\//i.test(v);
      if (LOADING_ATTRS.test(attr.name) && remote) external.push(`${attr.name}="${v}"`);
      else if (/url\(\s*['"]?(https?:)?\/\//i.test(v)) external.push(`${attr.name}="${v}"`);
    }
  }
  if (external.length > 0) {
    diagnostics.push({ code: 'external-reference', count: external.length, samples: external.slice(0, 3) });
  }

  const viewBox = readViewBox(doc.documentElement);

  // Strip what must never execute, then hand the *sanitized* markup on. The
  // loader does not run scripts, but the sanitized string is also what gets
  // stored, so this is the one place it can be done once.
  for (const s of Array.from(scripts)) s.parentNode?.removeChild(s);
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  }
  const safe = new XMLSerializer().serializeToString(doc);

  // ---- parse -----------------------------------------------------------
  const { SVGLoader } = await import('three/examples/jsm/loaders/SVGLoader.js');
  let paths: ReturnType<InstanceType<typeof SVGLoader>['parse']>['paths'];
  try {
    paths = new SVGLoader().parse(safe).paths;
  } catch (err) {
    return empty({ code: 'parse-failed', message: err instanceof Error ? err.message : String(err) });
  }

  const components: Component[] = [];
  let strokeOnly = 0;
  let degenerate = 0;
  let backgroundSkipped = false;
  let points = 0;

  paths.forEach((path, pathIndex) => {
    const style = (path as { userData?: { style?: Record<string, string> } }).userData?.style ?? {};
    const fill = style.fill;
    const hasFill = fill !== undefined ? fill !== 'none' && fill !== 'transparent' : true;
    const stroke = style.stroke;
    const hasStroke = stroke !== undefined && stroke !== 'none' && stroke !== 'transparent';

    if (!hasFill) {
      if (hasStroke) strokeOnly++;
      return;
    }

    const fillRule: FillRule = style.fillRule === 'evenodd' ? 'evenodd' : 'nonzero';
    const rings: Ring[] = [];
    for (const sub of path.subPaths) {
      const pts = sub.getPoints(opt.curveDivisions);
      if (pts.length < 3) { degenerate++; continue; }
      // getPoints repeats the start point on a closed sub-path; the engine's
      // rings close implicitly, and a duplicated vertex is a zero-length edge
      // that poisons normals and the distance field alike.
      // A closed sub-path can arrive with the start point repeated more than
      // once — an explicit closing `L` followed by `Z` gives two — so this
      // trims until the ring genuinely does not end where it starts.
      let n = pts.length;
      while (n > 3 && near(pts[0], pts[n - 1])) n--;
      // Consecutive duplicates anywhere are zero-length edges, which poison
      // both the vertex normals and the distance field.
      const kept: { x: number; y: number }[] = [];
      for (let i = 0; i < n; i++) {
        if (kept.length === 0 || !near(kept[kept.length - 1], pts[i])) kept.push(pts[i]);
      }
      if (kept.length < 3) { degenerate++; continue; }
      n = kept.length;
      const ring = new Float64Array(n * 2);
      for (let i = 0; i < n; i++) {
        ring[i * 2] = kept[i].x;
        ring[i * 2 + 1] = kept[i].y;
      }
      rings.push(ring);
      points += n;
    }
    if (rings.length === 0) return;

    if (opt.skipBackgroundRect && viewBox && rings.length === 1 && isViewBoxRect(rings[0], viewBox)) {
      backgroundSkipped = true;
      return;
    }

    components.push({
      id: `path-${pathIndex}`,
      rings,
      fillRule,
      color: normalizeColor(fill),
    });
  });

  if (strokeOnly > 0) diagnostics.push({ code: 'stroke-not-outlined', count: strokeOnly });
  if (degenerate > 0) diagnostics.push({ code: 'degenerate-path', count: degenerate });
  if (backgroundSkipped) diagnostics.push({ code: 'background-rect-skipped' });
  if (points > opt.maxPoints) {
    return empty({ code: 'too-complex', points, limit: opt.maxPoints });
  }
  if (components.length === 0) diagnostics.push({ code: 'no-fillable-geometry' });

  return { components, diagnostics, source, viewBox };
}

function near(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
}

function readViewBox(root: Element): ImportResult['viewBox'] {
  const raw = root.getAttribute('viewBox');
  if (raw) {
    const n = raw.trim().split(/[\s,]+/).map(Number);
    if (n.length === 4 && n.every(Number.isFinite)) {
      return { x: n[0], y: n[1], width: n[2], height: n[3] };
    }
  }
  const w = Number.parseFloat(root.getAttribute('width') ?? '');
  const h = Number.parseFloat(root.getAttribute('height') ?? '');
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return { x: 0, y: 0, width: w, height: h };
  return null;
}

/**
 * Is this ring the artboard itself?
 *
 * Illustrator and Figma routinely emit a full-bleed rectangle behind the
 * artwork. Extruded, it becomes a slab with the logo embossed on it — so it is
 * dropped, but a diagnostic says so, because occasionally that rectangle IS the
 * design.
 */
function isViewBoxRect(ring: Ring, viewBox: NonNullable<ImportResult['viewBox']>): boolean {
  if (ring.length / 2 > 5) return false;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < ring.length; i += 2) {
    minX = Math.min(minX, ring[i]); maxX = Math.max(maxX, ring[i]);
    minY = Math.min(minY, ring[i + 1]); maxY = Math.max(maxY, ring[i + 1]);
  }
  const tol = 0.01;
  return (
    Math.abs(maxX - minX - viewBox.width) / viewBox.width < tol &&
    Math.abs(maxY - minY - viewBox.height) / viewBox.height < tol
  );
}

function normalizeColor(fill: string | undefined): string | undefined {
  if (!fill || fill === 'none' || fill === 'transparent') return undefined;
  const v = fill.trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  return v;
}
