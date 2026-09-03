/**
 * Stable semantic IDs.
 *
 * A `sid` names what a node MEANS, so regeneration can find what it made
 * without depending on position, layer name, or Figma's own node ids.
 *
 * Three grammar rules, each closing a way the naive form collides — see
 * docs/superpowers/specs/2026-09-03-code-to-figma-design.md §9:
 *
 *   1. Axis values are SORTED by key. Iteration order is not identity, so
 *      {tone,state} and {state,tone} must produce the same sid.
 *   2. Repeated siblings take an ORDINAL. Without it `ds/menu/item/icon`
 *      collides three times over and reconciliation folds three nodes into one.
 *   3. A sid embeds only DECLARED axes — never the axes that survive
 *      deduplication. Dedup is measurement-driven, so if sids depended on its
 *      output a one-pixel change could re-key an entire component set.
 */

export type Axes = Record<string, string>;

const SEGMENT = /^[a-z0-9][a-z0-9-]*$/;

/** `ds/button` — a component set, or any plain path. */
export function sid(...segments: string[]): string {
  for (const s of segments) {
    if (!SEGMENT.test(s)) throw new Error(`invalid sid segment: ${JSON.stringify(s)}`);
  }
  return segments.join('/');
}

/**
 * `ds/button[size=md,state=hover,tone=primary]` — axes sorted by key.
 * Rule 1: the same axes in any order yield the same sid.
 */
export function variantSid(base: string, axes: Axes): string {
  const keys = Object.keys(axes).sort();
  if (!keys.length) return base;
  const body = keys.map((k) => `${k}=${axes[k]}`).join(',');
  return `${base}[${body}]`;
}

/**
 * `ds/menu/item#2/icon` — ordinal is 1-based and OMITTED for the first, so a
 * component with a single child keeps a clean sid and adding a second sibling
 * does not re-key the first.
 */
export function childSid(parent: string, role: string, ordinal = 1): string {
  if (!SEGMENT.test(role)) throw new Error(`invalid sid segment: ${JSON.stringify(role)}`);
  const suffix = ordinal > 1 ? `#${ordinal}` : '';
  return `${parent}/${role}${suffix}`;
}

export interface ParsedSid {
  base: string;
  axes: Axes;
  segments: Array<{ role: string; ordinal: number }>;
}

export function parseSid(value: string): ParsedSid {
  const m = value.match(/^([^[]+)(?:\[([^\]]*)\])?$/);
  if (!m) throw new Error(`unparseable sid: ${JSON.stringify(value)}`);
  const [, base, axisBody] = m;

  const axes: Axes = {};
  if (axisBody) {
    for (const pair of axisBody.split(',')) {
      const [k, ...rest] = pair.split('=');
      if (!k || !rest.length) throw new Error(`unparseable sid axes: ${JSON.stringify(value)}`);
      axes[k] = rest.join('=');
    }
  }

  const segments = base.split('/').map((seg) => {
    const om = seg.match(/^(.*?)#(\d+)$/);
    return om ? { role: om[1], ordinal: Number(om[2]) } : { role: seg, ordinal: 1 };
  });

  return { base, axes, segments };
}

/**
 * Assign ordinals across a sibling list by role.
 *
 * The FIRST occurrence of a role gets no suffix, so the common case (one child
 * per role) produces clean sids and stays stable when a sibling is added later.
 */
export function assignOrdinals(roles: string[]): string[] {
  const seen = new Map<string, number>();
  return roles.map((role) => {
    const n = (seen.get(role) ?? 0) + 1;
    seen.set(role, n);
    return n > 1 ? `${role}#${n}` : role;
  });
}

/** Deterministic plan ordering. Sorting by sid removes iteration order as a source of drift. */
export function bySid<T extends { sid: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sid < b.sid ? -1 : a.sid > b.sid ? 1 : 0));
}

/**
 * Deduplication maps several DECLARED sids onto one surviving node. Collapsing
 * changes which node a sid resolves to, never the sid itself — which is what
 * stops a measurement from re-keying a component set.
 */
export type AliasTable = Map<string, string>;

export function resolveAlias(table: AliasTable, value: string): string {
  const seen = new Set<string>();
  let cur = value;
  while (table.has(cur)) {
    if (seen.has(cur)) throw new Error(`alias cycle at ${cur}`);
    seen.add(cur);
    cur = table.get(cur)!;
  }
  return cur;
}
