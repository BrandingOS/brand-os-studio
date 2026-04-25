/**
 * Shape system entry point — one catalog per archetype.
 *
 * The deck has 10 archetypes (Cover, Manifesto, Moodboard, Palette,
 * Typography, Signature, Environmental, Digital, Stationery, Outdoor).
 * Each is a CATEGORY with its own catalog of SHAPES — composition
 * variants the user can swap on a single slide without changing the
 * deck-wide style.
 *
 * All 10 archetypes ship with a 10-shape catalog (100 shapes total).
 * The stub helper remains for any future archetype added before its
 * catalog lands.
 */

import { TYPOGRAPHY_CATALOG } from './typography';
import { COVER_CATALOG } from './cover';
import { MANIFESTO_CATALOG } from './manifesto';
import { PALETTE_CATALOG } from './palette';
import { MOODBOARD_CATALOG } from './moodboard';
import { SIGNATURE_CATALOG } from './signature';
import { ENVIRONMENTAL_CATALOG } from './environmental';
import { DIGITAL_CATALOG } from './digital';
import { STATIONERY_CATALOG } from './stationery';
import { OUTDOOR_CATALOG } from './outdoor';
import type { ShapeCatalog } from './types';
import type { SlideArchetype } from '../types';
import { ARCHETYPE_LABELS } from '../slides/renderer';

export type { SlideShape, ShapeCatalog, ShapeRenderProps } from './types';
export { TYPOGRAPHY_CATALOG, TYPOGRAPHY_SHAPES } from './typography';
export { COVER_CATALOG, COVER_SHAPES } from './cover';
export { MANIFESTO_CATALOG, MANIFESTO_SHAPES } from './manifesto';
export { PALETTE_CATALOG, PALETTE_SHAPES } from './palette';
export { MOODBOARD_CATALOG, MOODBOARD_SHAPES } from './moodboard';
export { SIGNATURE_CATALOG, SIGNATURE_SHAPES } from './signature';
export { ENVIRONMENTAL_CATALOG, ENVIRONMENTAL_SHAPES } from './environmental';
export { DIGITAL_CATALOG, DIGITAL_SHAPES } from './digital';
export { STATIONERY_CATALOG, STATIONERY_SHAPES } from './stationery';
export { OUTDOOR_CATALOG, OUTDOOR_SHAPES } from './outdoor';

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
  moodboard: MOODBOARD_CATALOG,
  palette: PALETTE_CATALOG,
  typography: TYPOGRAPHY_CATALOG,
  signature: SIGNATURE_CATALOG,
  environmental: ENVIRONMENTAL_CATALOG,
  digital: DIGITAL_CATALOG,
  stationery: STATIONERY_CATALOG,
  outdoor: OUTDOOR_CATALOG,
};

/** Resolve the active shape for a slide. */
export function resolveShape(archetype: SlideArchetype, shapeId: string | undefined, style: import('../styles').DeckStyle) {
  const catalog = CATALOGS[archetype];
  if (!catalog) return null;
  const id = shapeId ?? catalog.defaultFor(style);
  const shape = catalog.shapes.find((s) => s.id === id);
  return shape ?? catalog.shapes[0] ?? null;
}
