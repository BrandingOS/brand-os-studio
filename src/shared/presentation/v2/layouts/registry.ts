/**
 * Layout registry — defined in a separate module to break the
 * TDZ cycle:
 *
 *   index.ts (this file used to live here) declared LAYOUT_REGISTRY
 *   AND side-effect-imported every layout. ES module imports are
 *   hoisted, so a layout file calling `registerLayout` would try to
 *   touch LAYOUT_REGISTRY before the const had initialized → TDZ
 *   error: "Cannot access 'LAYOUT_REGISTRY' before initialization."
 *
 * Splitting the registry here lets layout files import only the
 * primitive (`registerLayout`) without dragging in the side-effect
 * imports of all OTHER layouts.
 */

import type { LayoutComponent, LayoutId } from '../types';

export const LAYOUT_REGISTRY: Partial<Record<LayoutId, LayoutComponent>> = {};

/** Register a layout. Called from each layout module's top-level. */
export function registerLayout(id: LayoutId, component: LayoutComponent): void {
  LAYOUT_REGISTRY[id] = component;
}

/** Look up a layout. Returns undefined if not registered yet. */
export function getLayout(id: LayoutId): LayoutComponent | undefined {
  return LAYOUT_REGISTRY[id];
}

/** All registered layout ids. */
export function listLayouts(): LayoutId[] {
  return Object.keys(LAYOUT_REGISTRY) as LayoutId[];
}
