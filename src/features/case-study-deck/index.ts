/**
 * Public entry for the case-study-deck feature.
 *
 * Anything consumed by pages, routes, or other features goes through here.
 */

export { CaseStudyViewer } from './viewer/CaseStudyViewer';
export { useDeckPlan } from './hooks/useDeckPlan';
export { directDeck, buildProfile } from './director';
export { exportDeck } from './export';
export type {
  BrandProfile,
  DeckMode,
  DeckPlan,
  SlideArchetype,
  SlidePick,
  SlideOverrides,
  VariantId,
} from './types';
