/**
 * The IR — a normalized semantic scene graph.
 *
 * This is the boundary between the two halves of the pipeline. It knows nothing
 * about the DOM and nothing about Figma; the extractor writes it, the renderer
 * reads it, and either side can be rewritten without touching the other.
 *
 * See docs/superpowers/specs/2026-09-03-code-to-figma-design.md §6.
 */

/** Bumped on a breaking change. Migrations live in ./migrations. */
export const IR_VERSION = 1;

/** A capture axis. One IRDoc per (theme x viewport x direction) — never merged. */
export type Theme = 'light' | 'dark';
export type Direction = 'ltr' | 'rtl';

export interface IRDoc {
  irVersion: number;
  meta: {
    capturedAt: string;
    theme: Theme;
    direction: Direction;
    viewport: { w: number; h: number };
    appCommit: string;
    url: string;
    fixture: string;
  };
  tokens: IRToken[];
  roots: IRNode[];
  /** Document-level rollup: every node's losses, plus losses belonging to no node. */
  losses: IRLoss[];
}

export interface IRToken {
  name: string;                       // '--ds-accent'
  value: string;                      // resolved in this doc's theme
  kind: 'color' | 'number' | 'shadow' | 'type' | 'motion';
}

/**
 * A paint that remembers which token produced it. This is what makes binding to
 * Figma variables mechanical instead of a later manual chore — the extractor
 * builds a reverse map from resolved value to `--ds-*` name, per theme.
 */
export interface IRPaint {
  value: string;
  token?: string;
}

export interface IREffect {
  type: 'drop-shadow' | 'inner-shadow' | 'blur';
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: IRPaint;
  /** Composite effects (--ds-shadow-float is two layers) keep their order. */
  index: number;
}

export type Sizing = 'hug' | 'fill' | 'fixed';

/**
 * Layout intent, NOT measured pixels.
 *
 * A converter that measures `width: 143px` and writes a fixed frame produces a
 * file that looks perfect and dies the moment anyone resizes it. `w`/`h` are the
 * fallback for `fixed` only.
 */
export interface IRSizing {
  width: Sizing;
  height: Sizing;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}

export type IRLayout =
  | {
      mode: 'auto';
      direction: 'row' | 'column';
      gap: number;
      padding: [number, number, number, number];   // top right bottom left
      primaryAlign: 'min' | 'center' | 'max' | 'space-between';
      counterAlign: 'min' | 'center' | 'max' | 'baseline';
      wrap: boolean;
    }
  /** An honest, visible fallback — never the default. */
  | { mode: 'absolute' };

export interface IRText {
  characters: string;
  family: string;
  weight: number;
  size: number;
  lineHeight: number | 'auto';
  letterSpacing: number;
  align: 'left' | 'center' | 'right' | 'justify';
  direction: Direction;
  color: IRPaint;
}

export type IRLossReason =
  | 'unsupported-in-figma'
  | 'intentional-normalization'
  | 'approximated';

export interface IRLoss {
  sid: string;
  property: string;
  cssValue: string;
  reason: IRLossReason;
  note: string;
}

export type IRNodeKind =
  | 'component'
  | 'variant'
  | 'instance'
  | 'frame'
  | 'text'
  | 'vector'
  | 'image';

export interface IRNode {
  /** Stable semantic id. Derived from meaning — never from position or node id. */
  sid: string;
  name: string;
  kind: IRNodeKind;
  semantic?: {
    component?: string;
    /** Declared axes only. Never the axes that survive deduplication (§9). */
    variant?: Record<string, string>;
    role?: string;
    instanceOf?: string;
  };
  layout: IRLayout;
  sizing: IRSizing;
  /**
   * Offset from the parent's top-left, in the parent's own coordinates.
   *
   * Present ONLY when the parent lays its children out absolutely. Figma has no
   * equivalent of CSS's positioning rules, so an absolute child that arrives
   * without coordinates is appended at the origin and every sibling stacks on
   * top of the first — which is what turned the workspace top bar into a pile
   * at 0,0. Auto-layout children must NOT carry this: their position is the
   * layout's job, and setting x/y on one is meaningless.
   */
  pos?: { x: number; y: number };
  style: {
    fills: IRPaint[];
    strokes: IRPaint[];
    strokeWeight?: number;
    radii: [number, number, number, number];
    effects: IREffect[];
    opacity: number;
    clip: boolean;
  };
  text?: IRText;
  vector?: { svg: string };
  /** A REFERENCE, never bytes — use_figma's `code` is capped at 50,000 chars. */
  image?: { hash: string; mime: string; width: number; height: number; scaleMode: string };
  children: IRNode[];
  losses: IRLoss[];
}

/** Every node in document order, parents before children. */
export function walkIR(node: IRNode, visit: (n: IRNode, depth: number) => void, depth = 0): void {
  visit(node, depth);
  for (const child of node.children) walkIR(child, visit, depth + 1);
}

export function allNodes(doc: IRDoc): IRNode[] {
  const out: IRNode[] = [];
  for (const root of doc.roots) walkIR(root, (n) => out.push(n));
  return out;
}
