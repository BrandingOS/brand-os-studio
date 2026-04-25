/**
 * Slide registry — maps (archetype, variant) → React component.
 * This is the only file that imports the concrete slide modules.
 */

import type { BrandProfile, SlideOverrides, SlidePick } from '../types';
import { CoverA, CoverB, CoverC, CoverD } from './CoverSlides';
import { ManifestoA, ManifestoB, ManifestoC } from './ManifestoSlides';
import { MoodboardA, MoodboardB, MoodboardC } from './MoodboardSlides';
import { PaletteA, PaletteB, PaletteC } from './PaletteSlides';
import { TypographyA, TypographyB, TypographyC } from './TypographySlides';
import { SignatureA, SignatureB, SignatureC, SignatureD } from './SignatureSlide';
import { EnvironmentalA, EnvironmentalB, EnvironmentalC } from './EnvironmentalSlides';
import { DigitalA, DigitalB, DigitalC } from './DigitalSlides';
import { StationeryA, StationeryB, StationeryC } from './StationerySlides';
import { OutdoorA, OutdoorB, OutdoorC } from './OutdoorSlides';

interface SlideProps {
  index: number;
  profile: BrandProfile;
  overrides?: SlideOverrides;
}

type SlideComponent = React.ComponentType<SlideProps>;

const REGISTRY: Record<string, SlideComponent> = {
  'cover-A': CoverA,
  'cover-B': CoverB,
  'cover-C': CoverC,
  'cover-D': CoverD,

  'manifesto-A': ManifestoA,
  'manifesto-B': ManifestoB,
  'manifesto-C': ManifestoC,

  'moodboard-A': MoodboardA,
  'moodboard-B': MoodboardB,
  'moodboard-C': MoodboardC,

  'palette-A': PaletteA,
  'palette-B': PaletteB,
  'palette-C': PaletteC,

  'typography-A': TypographyA,
  'typography-B': TypographyB,
  'typography-C': TypographyC,

  'signature-A': SignatureA,
  'signature-B': SignatureB,
  'signature-C': SignatureC,
  'signature-D': SignatureD,

  'environmental-A': EnvironmentalA,
  'environmental-B': EnvironmentalB,
  'environmental-C': EnvironmentalC,

  'digital-A': DigitalA,
  'digital-B': DigitalB,
  'digital-C': DigitalC,

  'stationery-A': StationeryA,
  'stationery-B': StationeryB,
  'stationery-C': StationeryC,

  'outdoor-A': OutdoorA,
  'outdoor-B': OutdoorB,
  'outdoor-C': OutdoorC,
};

export function resolveSlide(pick: SlidePick): SlideComponent | undefined {
  return REGISTRY[`${pick.archetype}-${pick.variant}`];
}

/** Catalog used by the editor to offer variant swaps. */
export const SLIDE_CATALOG: Record<string, string[]> = {
  cover: ['A', 'B', 'C', 'D'],
  manifesto: ['A', 'B', 'C'],
  moodboard: ['A', 'B', 'C'],
  palette: ['A', 'B', 'C'],
  typography: ['A', 'B', 'C'],
  signature: ['A', 'B', 'C', 'D'],
  environmental: ['A', 'B', 'C'],
  digital: ['A', 'B', 'C'],
  stationery: ['A', 'B', 'C'],
  outdoor: ['A', 'B', 'C'],
};

/** Human labels for each archetype. */
export const ARCHETYPE_LABELS: Record<string, string> = {
  cover: 'Cover',
  manifesto: 'Manifesto',
  moodboard: 'Moodboard',
  palette: 'Color palette',
  typography: 'Typography',
  signature: 'Signature artwork',
  environmental: 'Environmental',
  digital: 'Digital',
  stationery: 'Stationery',
  outdoor: 'Outdoor',
};
