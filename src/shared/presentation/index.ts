export { PresentationCustomizer } from './PresentationCustomizer';
export {
  CoverPage,
  SectionDividerPage,
  TwoColumnPage,
  TwoColumnReversePage,
  FullBleedImagePage,
  ThreeColumnPage,
  QuotePage,
  StatsPage,
  ListPage,
  ClosingPage,
  type PageProps,
} from './pages';
export { createPresentationStore } from './store';
export type { PresentationStore } from './store';
export {
  PRESENTATION_STYLES,
  getStyleById,
  type PresentationStyle,
} from './styles';
export {
  DEFAULT_PRESENTATION_SETTINGS,
  SIZE_PRESETS,
  type PresentationSettings,
  type PresentationSettingsActions,
  type PresentationTemplate,
  type SizeFormat,
} from './types';
