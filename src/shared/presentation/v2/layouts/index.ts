/**
 * LAYOUT_REGISTRY — the v2 layout library.
 *
 * Architecture:
 *   - `./registry.ts` owns the registry primitive (the const + the
 *     register/get/list helpers). Layout files import ONLY from there.
 *   - This file (index.ts) re-exports the public API AND side-effect
 *     imports every layout file so they self-register on module load.
 *
 * Adding a new layout:
 *   1. Write `./<id>.tsx`. At its top level, call
 *      `registerLayout('<id>', Component)` (importing from
 *      './registry').
 *   2. Add a side-effect import below.
 *   3. (Optional) Reference it from a template's slides[] entries.
 */

export { LAYOUT_REGISTRY, registerLayout, getLayout, listLayouts } from './registry';

/* ─── Side-effect imports — populate LAYOUT_REGISTRY ───────────────── */
//
// Each layout file calls `registerLayout(id, Component)` at module
// scope, so importing the file is enough to register it. The order
// doesn't matter — the registry is a keyed map.
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
