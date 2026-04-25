export type { DeckStyle, DeckStyleId, DeckStyleCategory, SlideStyleChoice } from './types';
export { STYLES, STYLE_ORDER, ALL_STYLES, defaultStyleForMode, fontStackFor } from './presets';
export {
  resolveSurface,
  resolveBackground,
  resolveFonts,
  headingSize,
  bodySize,
  fitHeadingSize,
  chromeTopPad,
  chromeBottomPad,
  contentRegion,
  regionsFor,
  CANVAS,
  type SurfaceTokens,
  type SlideRect,
  type RegionLayout,
  type RegionPair,
} from './tokens';
export { FitText, type FitTextProps } from './FitText';
export { TopBar, BottomBar, CornerNumeral } from './chrome';
export { applyMaster, resolveSlideStyle, MASTER_DEFAULTS, type MasterOverrides } from './master';
