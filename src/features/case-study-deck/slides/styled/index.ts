/**
 * Style-aware archetype renderers.
 *
 * One renderer per archetype — each one accepts a `DeckStyle` and adapts.
 * Replaces the old per-slide A/B/C/D variants in favor of deck-wide
 * STYLES/templates that propagate across every archetype.
 */

import type { ComponentType } from 'react';
import { CoverStyled, type StyledSlideProps as BaseStyledSlideProps } from './CoverStyled';

export interface StyledSlideProps extends BaseStyledSlideProps {
  /** Optional per-slide shape id; archetype renderer maps to its catalog. */
  shapeId?: string;
}
import { ManifestoStyled } from './ManifestoStyled';
import { PaletteStyled } from './PaletteStyled';
import { TypographyStyled } from './TypographyStyled';
import {
  MoodboardStyled,
  SignatureStyled,
  EnvironmentalStyled,
  DigitalStyled,
  StationeryStyled,
  OutdoorStyled,
} from './RemainingStyled';
import type { SlideArchetype } from '../../types';

export { CoverStyled, ManifestoStyled, PaletteStyled, TypographyStyled };
export { MoodboardStyled, SignatureStyled, EnvironmentalStyled, DigitalStyled, StationeryStyled, OutdoorStyled };

const REGISTRY: Record<SlideArchetype, ComponentType<StyledSlideProps>> = {
  cover: CoverStyled,
  manifesto: ManifestoStyled,
  moodboard: MoodboardStyled,
  palette: PaletteStyled,
  typography: TypographyStyled,
  signature: SignatureStyled,
  environmental: EnvironmentalStyled,
  digital: DigitalStyled,
  stationery: StationeryStyled,
  outdoor: OutdoorStyled,
};

export function resolveStyledSlide(archetype: SlideArchetype): ComponentType<StyledSlideProps> | undefined {
  return REGISTRY[archetype];
}
