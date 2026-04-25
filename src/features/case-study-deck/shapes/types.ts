/**
 * Per-slide SHAPE system — composition variants within a single
 * archetype (= category).
 *
 * The deck-wide STYLE controls typography / spacing / chrome / colors.
 * The per-slide SHAPE controls how content is COMPOSED inside the
 * body region — e.g. "Aa specimen card" vs "weight ladder" vs
 * "ABCDEFG row" for the Typography category.
 *
 * A user picks a STYLE once for the whole deck, then optionally swaps
 * the SHAPE on individual slides without disturbing the deck's design
 * language. Shapes always read tokens from the active style so the
 * deck stays cohesive.
 *
 *   slide.shapeId ?? defaultShapeForStyle(archetype, style)
 */

import type { ReactNode } from 'react';
import type { BrandProfile, SlideOverrides } from '../types';
import type { DeckStyle, SurfaceTokens, SlideRect } from '../styles';

export interface ShapeRenderProps {
  profile: BrandProfile;
  style: DeckStyle;
  surface: SurfaceTokens;
  fonts: { heading: string; body: string };
  /** Body region after chrome reservations — the box the shape MUST stay inside. */
  region: SlideRect;
  /** User overrides (headline / subhead / image / credit). */
  overrides?: SlideOverrides;
}

export interface SlideShape {
  /** Stable id used in storage. e.g. 'aa-specimen-card'. */
  id: string;
  /** Short user-facing label. e.g. 'Aa Specimen'. */
  name: string;
  /** One-line description for the picker. */
  description?: string;
  /** Body renderer. Returns the composition that goes inside the slide region. */
  render: (props: ShapeRenderProps) => ReactNode;
}

/** A single archetype's shape catalog. */
export interface ShapeCatalog {
  archetype: string;
  /** Human label of the category — shown in the inspector ("Typography", "Color Palette"). */
  categoryLabel: string;
  shapes: SlideShape[];
  /** Returns the default shape id given the active deck style. */
  defaultFor: (style: DeckStyle) => string;
}
