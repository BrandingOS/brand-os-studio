/**
 * LAYOUT_REGISTRY — the v2 layout library. Add a new layout =
 *   1. Write the file under `./layouts/<id>.tsx`.
 *   2. Register it here.
 *   3. (Optional) Add it to a template's slides[] entries.
 *
 * That's it. No new component files per slide, no new variant trees.
 */

import type { LayoutComponent, LayoutId } from '../types';

/**
 * Lazily collected on first read. Each layout file exports a default
 * component; entries below are populated as they're written.
 *
 * Phase 1 ships them all; this stub registry exists so the renderer
 * compiles before every layout file lands.
 */
export const LAYOUT_REGISTRY: Partial<Record<LayoutId, LayoutComponent>> = {
  // Filled in by ./<id>.tsx files (Cover, Bullets, …).
};

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
