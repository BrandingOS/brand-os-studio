/**
 * IR -> RenderPlan. Pure: no Figma calls, no I/O.
 *
 * A RenderPlan is serialisable data describing Plugin-API work. Both transports
 * (MCP and the local plugin) execute the SAME plan through the SAME walker, so
 * rendering decisions cannot diverge between them — the transports differ only
 * in how the plan is delivered.
 */
import type { IRDoc, IRNode, IRPaint } from '../ir/types';
import { bySid, parseSid } from '../ir/sid';

export const PLAN_VERSION = 1;

export interface PlanPaint {
  /** Literal value, used when no token backs it. */
  v: string;
  /** Variable name to bind, when a token does. */
  t?: string;
}

export interface PlanNode {
  sid: string;
  name: string;
  kind: IRNode['kind'];
  layout: IRNode['layout'];
  sizing: IRNode['sizing'];
  fills: PlanPaint[];
  strokes: PlanPaint[];
  sw?: number;
  radii: [number, number, number, number];
  effects: Array<{ x: number; y: number; blur: number; spread: number; color: PlanPaint }>;
  opacity: number;
  text?: {
    characters: string; family: string; weight: number; size: number;
    lineHeight: number | 'auto'; letterSpacing: number; color: PlanPaint;
  };
  svg?: string;
  /**
   * The sid of a component this node must become an INSTANCE of.
   *
   * A pattern that contains another pattern — a colours group made of swatches,
   * a rail made of rows — is composed, not copied. Without this the container
   * held a flattened stranger, so editing the swatch would not change the
   * palette that is made of swatches, which is the whole point of a system.
   */
  ref?: string;
  /** Offset inside an absolutely-laid-out parent. See IRNode.pos. */
  pos?: { x: number; y: number };
  children: PlanNode[];
}

export interface PlanVariant {
  sid: string;
  /** Figma parses "k=v, k=v" into variant properties on combine. */
  name: string;
  axes: Record<string, string>;
  node: PlanNode;
}

export interface PlanSet {
  sid: string;
  name: string;
  page: string;
  /** Optional child roles exposed as Figma BOOLEAN properties. */
  booleanProps?: Array<{ name: string; role: string; default: boolean }>;
  variants: PlanVariant[];
}

export interface PlanVariable {
  name: string;
  type: 'COLOR' | 'FLOAT';
  /** Value per mode name. Light and Dark are real modes on this plan tier. */
  values: Record<string, string | number>;
  scopes: string[];
}

export interface RenderPlan {
  planVersion: number;
  gen: string;
  collections: Array<{ name: string; modes: string[]; variables: PlanVariable[] }>;
  sets: PlanSet[];
}

// ---------------------------------------------------------------------------

const COLOR_TOKEN = /^--ds-/;

/** A token name becomes a readable Figma variable path: --ds-surface-hover -> surface/hover. */
export function variableNameFor(token: string): string {
  const bare = token.replace(COLOR_TOKEN, '');
  const [head, ...rest] = bare.split('-');
  return rest.length ? `${head}/${rest.join('-')}` : head;
}

function toPlanPaint(p: IRPaint): PlanPaint {
  return p.token ? { v: p.value, t: variableNameFor(p.token) } : { v: p.value };
}

function toPlanNode(n: IRNode): PlanNode {
  const out: PlanNode = {
    sid: n.sid,
    name: n.name,
    kind: n.kind,
    layout: n.layout,
    sizing: n.sizing,
    fills: n.style.fills.map(toPlanPaint),
    strokes: n.style.strokes.map(toPlanPaint),
    radii: n.style.radii,
    effects: n.style.effects.map((e) => ({
      x: e.x, y: e.y, blur: e.blur, spread: e.spread, color: toPlanPaint(e.color),
    })),
    opacity: n.style.opacity,
    children: n.children.map(toPlanNode),
  };
  if (n.style.strokeWeight) out.sw = n.style.strokeWeight;
  if (n.text) {
    out.text = {
      characters: n.text.characters,
      family: n.text.family,
      weight: n.text.weight,
      size: n.text.size,
      lineHeight: n.text.lineHeight,
      letterSpacing: n.text.letterSpacing,
      color: toPlanPaint(n.text.color),
    };
  }
  if (n.vector) out.svg = n.vector.svg;
  if (n.semantic?.instanceOf) out.ref = n.semantic.instanceOf;
  if (n.pos) out.pos = n.pos;
  return out;
}

/**
 * Merge a light and a dark capture into one plan.
 *
 * `meta.theme` is scalar by design — a capture never half-describes two themes —
 * so the join happens here. Matching is by `sid`, and per property:
 *
 *   both sides share a token  -> bind once; the variable carries both modes
 *   values identical          -> a literal; no mode needed
 *   values differ, no token   -> theme-varying with nothing behind it. The
 *                                variable is MINTED into `Generated / Unmapped`
 *                                and the gap is recorded, because hiding it
 *                                behind a literal would lose the dark value.
 */
export interface MergeResult {
  plan: RenderPlan;
  unmapped: Array<{ sid: string; property: string; light: string; dark: string }>;
  /**
   * Cells that MEASURED identical to another cell and are KEPT anyway.
   *
   * A declared variant is a choice the designer must be able to make. That two
   * cells look alike today is a fact about the CSS, not about the design
   * contract — so it is reported here and never acted on.
   */
  visuallyIdentical: Array<{ sid: string; same: string; axes: Record<string, string> }>;
  droppedAxes: string[];
}

/**
 * A stable hash over what a variant LOOKS and LAYS OUT like.
 *
 * `sid` and the variant axes are excluded on purpose — two cells are duplicates
 * precisely when everything except their names is identical. Node ids and
 * measured x/y are excluded for the same reason.
 */
export function visualFingerprint(node: PlanNode): string {
  const shape = (n: PlanNode): unknown => ({
    k: n.kind,
    l: n.layout,
    z: n.sizing ? { w: n.sizing.width, h: n.sizing.height, mw: n.sizing.minW } : null,
    f: n.fills,
    s: n.strokes,
    sw: n.sw,
    r: n.radii,
    e: n.effects,
    o: n.opacity,
    t: n.text ? { ...n.text, characters: n.text.characters } : null,
    v: n.svg,
    // Two cells pointing at DIFFERENT components are not the same cell, even
    // when everything the fingerprint can see about them matches.
    i: n.ref,
    c: n.children.map(shape),
  });
  return JSON.stringify(shape(node));
}

/**
 * Report variants that measured identical. NOTHING IS DELETED.
 *
 * This function used to collapse cells whose visual fingerprints matched. That
 * deleted `disabled` from DsSwitch / DsCheckbox / DsRadio, because the product
 * renders a disabled toggle exactly like an enabled one — a real accessibility
 * defect in the CSS, which the pipeline then HID by removing the state from the
 * design system.
 *
 * Visual identity is not semantic identity. A designer must still be able to
 * choose "disabled", and a `tone=success` toast that currently paints like
 * `tone=neutral` is a bug to fix, not a variant to drop. So every declared cell
 * survives and the match is reported instead.
 *
 * `sparse` remains the right place to prune: it prunes what is knowable from
 * the DECLARATION, before anything is measured.
 */
export function dedupeVariants(set: PlanSet): {
  set: PlanSet;
  visuallyIdentical: MergeResult['visuallyIdentical'];
  droppedAxes: string[];
} {
  const byPrint = new Map<string, PlanVariant>();
  const visuallyIdentical: MergeResult['visuallyIdentical'] = [];

  for (const variant of set.variants) {
    const print = visualFingerprint(variant.node);
    const first = byPrint.get(print);
    if (!first) { byPrint.set(print, variant); continue; }
    visuallyIdentical.push({ sid: variant.sid, same: first.sid, axes: variant.axes });
  }

  // An axis carrying ONE declared value distinguishes nothing, so it is dropped
  // from the variant names. That is a fact about the declaration rather than
  // about the measurement, so it costs no semantics — and it is what turns a
  // one-cell set into the plain COMPONENT the Figma API requires.
  const droppedAxes: string[] = [];
  const axisNames = [...new Set(set.variants.flatMap((v) => Object.keys(v.axes)))];
  for (const axis of axisNames) {
    const values = new Set(set.variants.map((v) => v.axes[axis]));
    if (values.size <= 1) droppedAxes.push(axis);
  }

  const variants = set.variants.map((v) => {
    const axes = Object.fromEntries(
      Object.entries(v.axes).filter(([k]) => !droppedAxes.includes(k)),
    );
    return {
      ...v,
      axes,
      name: Object.keys(axes).sort().map((k) => `${k}=${axes[k]}`).join(', ') || 'default',
    };
  });

  return { set: { ...set, variants }, visuallyIdentical, droppedAxes };
}

/** Every component sid this set instantiates. */
export function refsOf(set: PlanSet): string[] {
  const out = new Set<string>();
  const walk = (n: PlanNode) => {
    if (n.ref) out.add(n.ref);
    n.children.forEach(walk);
  };
  set.variants.forEach((v) => walk(v.node));
  return [...out];
}

/**
 * Order sets so a container is built AFTER everything it instantiates.
 *
 * The walker resolves a `ref` against components that already exist, so a
 * container built first finds nothing and emits a MISSING INSTANCE placeholder.
 * Sorting by sid happened to satisfy all three of the current dependencies —
 * `color-swatch` precedes `colors-group`, `rail-row` precedes `section-rail`,
 * `segmented-nav` precedes `workspace-topbar` — which is luck, not a property,
 * and the next pattern named `a-…` containing a `z-…` would break silently.
 *
 * Ties keep sid order so the output stays deterministic, and a cycle is left in
 * sid order rather than throwing: a cycle is a manifest bug that should surface
 * as a named missing instance on the canvas, not as a failed run.
 */
export function orderByDependency(sets: PlanSet[]): PlanSet[] {
  const bySid = new Map(sets.map((s) => [s.sid, s]));
  const sorted = [...sets].sort((a, b) => (a.sid < b.sid ? -1 : 1));
  const out: PlanSet[] = [];
  const state = new Map<string, 'visiting' | 'done'>();

  const visit = (set: PlanSet) => {
    const at = state.get(set.sid);
    if (at) return;                       // done, or a cycle we decline to chase
    state.set(set.sid, 'visiting');
    for (const ref of refsOf(set).sort()) {
      // A variant sid carries an "[axis=value]" suffix; the SET is what is built.
      const dep = bySid.get(ref) ?? bySid.get(parseSid(ref).base);
      if (dep && dep !== set) visit(dep);
    }
    state.set(set.sid, 'done');
    out.push(set);
  };

  for (const set of sorted) visit(set);
  return out;
}

export function mergeThemes(
  light: IRDoc,
  dark: IRDoc,
  opts: { page: string; gen: string },
): MergeResult {
  const unmapped: MergeResult['unmapped'] = [];

  // Tokens present in both captures become one variable with two modes.
  const byName = new Map<string, PlanVariable>();
  const index = (doc: IRDoc, mode: 'Light' | 'Dark') => {
    for (const t of doc.tokens) {
      if (t.kind !== 'color') continue;
      const name = variableNameFor(t.name);
      const existing = byName.get(name) ?? { name, type: 'COLOR' as const, values: {}, scopes: [] };
      existing.values[mode] = t.value;
      byName.set(name, existing);
    }
  };
  index(light, 'Light');
  index(dark, 'Dark');

  // Only variables defined in BOTH modes are safe to bind; a half-defined
  // variable would resolve to nothing in the missing mode.
  const variables = [...byName.values()]
    .filter((v) => v.values.Light !== undefined && v.values.Dark !== undefined)
    .sort((a, b) => (a.name < b.name ? -1 : 1));

  const darkBySid = new Map<string, IRNode>();
  for (const root of dark.roots) collect(root, darkBySid);

  const sets = new Map<string, PlanSet>();
  for (const root of bySid(light.roots)) {
    const component = root.semantic?.component ?? 'Component';
    // The set's sid is the variant sid's BASE — the manifest's own root — not a
    // name-derived guess. Deriving it from the component name produced
    // `ds/dsmenu` where the manifest declares `ds/menu`, which would have made
    // reconciliation miss its own prior output and duplicate the set on rerun.
    const setSid = parseSid(root.sid).base;
    const set = sets.get(setSid) ?? { sid: setSid, name: component, page: opts.page, variants: [],
      booleanProps: (root.semantic as { booleanProps?: PlanSet['booleanProps'] })?.booleanProps ?? [] };

    const axes = root.semantic?.variant ?? {};
    const darkNode = darkBySid.get(root.sid);
    if (darkNode) reportUnmapped(root, darkNode, unmapped);

    set.variants.push({
      sid: root.sid,
      name: Object.keys(axes).sort().map((k) => `${k}=${axes[k]}`).join(', ') || 'default',
      axes,
      node: toPlanNode(root),
    });
    sets.set(setSid, set);
  }

  const visuallyIdentical: MergeResult['visuallyIdentical'] = [];
  const droppedAxes: string[] = [];
  const deduped = orderByDependency([...sets.values()])
    .map((set) => {
      const r = dedupeVariants(set);
      visuallyIdentical.push(...r.visuallyIdentical);
      droppedAxes.push(...r.droppedAxes.map((a) => `${set.sid}:${a}`));
      return r.set;
    });

  return {
    plan: {
      planVersion: PLAN_VERSION,
      gen: opts.gen,
      collections: variables.length
        ? [{ name: 'BrandingOS', modes: ['Light', 'Dark'], variables }]
        : [],
      sets: deduped,
    },
    unmapped,
    visuallyIdentical,
    droppedAxes,
  };
}

function collect(node: IRNode, into: Map<string, IRNode>) {
  into.set(node.sid, node);
  for (const c of node.children) collect(c, into);
}

/** A theme-varying value with no token behind it is a gap worth naming. */
function reportUnmapped(l: IRNode, d: IRNode, out: MergeResult['unmapped']) {
  const pairs: Array<[string, IRPaint | undefined, IRPaint | undefined]> = [
    ['fill', l.style.fills[0], d.style.fills[0]],
    ['stroke', l.style.strokes[0], d.style.strokes[0]],
    ['text', l.text?.color, d.text?.color],
  ];
  for (const [prop, a, b] of pairs) {
    if (!a || !b) continue;
    if (a.token || b.token) continue;
    if (a.value === b.value) continue;
    out.push({ sid: l.sid, property: prop, light: a.value, dark: b.value });
  }
  const n = Math.min(l.children.length, d.children.length);
  for (let i = 0; i < n; i++) reportUnmapped(l.children[i], d.children[i], out);
}
