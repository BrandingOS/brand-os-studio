export { GuidelinesEditor } from './components/GuidelinesEditor';
export { SlideNavigator } from './components/SlideNavigator';
export { PreviewCanvas } from './components/PreviewCanvas';
export { GuidelineCustomizer } from './components/GuidelineCustomizer';

export { useGuidelinesStore } from './store/guidelinesStore';
export { useGuidelinesEditor } from './hooks/useGuidelinesEditor';

export { GUIDELINE_TEMPLATES, getTemplateById, getTemplateComponent } from './templates/template-registry';
export { MinimalTemplate } from './templates/MinimalTemplate';

export type { 
  GuidelineTemplate,
  GuidelineSettings,
  GuidelineSlide,
  GuidelinePanel
} from './types/guidelines';