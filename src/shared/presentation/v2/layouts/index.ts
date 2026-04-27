/**
 * LAYOUT_REGISTRY — the v2 layout library. Add a new layout =
 *   1. Write the file under `./layouts/<id>.tsx`.
 *   2. Import it from this file (its top-level `registerLayout` call
 *      will populate the registry as a side-effect).
 *   3. (Optional) Add it to a template's slides[] entries.
 *
 * That's it. No new component files per slide, no new variant trees.
 */

import type { LayoutComponent, LayoutId } from '../types';

/**
 * Lazily collected on first read. Each layout file exports a default
 * component AND calls `registerLayout(id, Component)` at its top level
 * — importing the module is enough to register it.
 */
export const LAYOUT_REGISTRY: Partial<Record<LayoutId, LayoutComponent>> = {
  // Filled by the side-effect imports below + any additional layout
  // files that follow the same pattern.
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

/* ─── Side-effect imports — populate LAYOUT_REGISTRY ───────────────── */
//
// Each layout file calls `registerLayout(id, Component)` at module
// scope, so importing the file is enough to register it. Order doesn't
// matter — the registry is just a keyed map.
import './cover';
import './section-divider';
import './title-body';
import './bullets';
import './two-column';
import './image-text';
import './quote';
import './stats-3';
import './stats-grid';
import './team-grid';
import './process';
import './comparison';
import './gallery';
import './metrics-hero';
import './cta';
