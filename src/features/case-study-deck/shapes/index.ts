/**
 * Shape system entry point — one catalog per archetype.
 *
 * The deck has 10 archetypes (Cover, Manifesto, Moodboard, Palette,
 * Typography, Signature, Environmental, Digital, Stationery, Outdoor).
 * Each is a CATEGORY with its own catalog of SHAPES — composition
 * variants the user can swap on a single slide without changing the
 * deck-wide style.
 *
 * Today: Typography is the proof-of-concept (10 shapes). The other
 * archetypes still render via their style-driven body in slides/styled/.
 * They expose a single 'default' shape so the inspector UI can
 * surface the category label uniformly.
 */

import { TYPOGRAPHY_CATALOG } from './typography';
import { COVER_CATALOG } from './cover';
import { MANIFESTO_CATALOG } from './manifesto';
import { PALETTE_CATALOG } from './palette';
import type { ShapeCatalog } from './types';
import type { SlideArchetype } from '../types';
import { ARCHETYPE_LABELS } from '../slides/renderer';

export type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
export { TYPOGRAPHY_CATALOG, TYPOGRAPHY_SHAPES } from './typography';
export { COVER_CATALOG, COVER_SHAPES } from './cover';
export { MANIFESTO_CATALOG, MANIFESTO_SHAPES } from './manifesto';
export { PALETTE_CATALOG, PALETTE_SHAPES } from './palette';

/** Stub catalog used by archetypes that haven't been migrated yet. */
function stubCatalog(archetype: SlideArchetype): ShapeCatalog {
  return {
    archetype,
    categoryLabel: ARCHETYPE_LABELS[archetype] ?? archetype,
    shapes: [
      {
        id: 'default',
        name: 'Default',
        description: 'The single default composition for this category.',
        render: () => null,
      },
    ],
    defaultFor: () => 'default',
  };
}

export const CATALOGS: Record<SlideArchetype, ShapeCatalog> = {
  cover: COVER_CATALOG,
  manifesto: MANIFESTO_CATALOG,
  moodboard: stubCatalog('moodboard'),
  palette: PALETTE_CATALOG,
  typography: TYPOGRAPHY_CATALOG,
  signature: stubCatalog('signature'),
  environmental: stubCatalog('environmental'),
  digital: stubCatalog('digital'),
  stationery: stubCatalog('stationery'),
  outdoor: stubCatalog('outdoor'),
};

/** Resolve the active shape for a slide. */
export function resolveShape(archetype: SlideArchetype, shapeId: string | undefined, style: import('../styles').DeckStyle) {
  const catalog = CATALOGS[archetype];
  if (!catalog) return null;
  const id = shapeId ?? catalog.defaultFor(style);
  const shape = catalog.shapes.find((s) => s.id === id);
  return shape ?? catalog.shapes[0] ?? null;
}
