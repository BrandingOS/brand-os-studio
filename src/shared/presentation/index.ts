export { PresentationCustomizer } from './PresentationCustomizer';
export { TemplatePicker } from './TemplatePicker';
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
  buildTemplateSlides,
  CONTENT_TYPES,
  type ContentType,
  type ContentTypeInfo,
} from './templates';
export {
  DEFAULT_PRESENTATION_SETTINGS,
  SIZE_PRESETS,
  type PresentationSettings,
  type PresentationSettingsActions,
  type PresentationTemplate,
  type SizeFormat,
} from './types';
