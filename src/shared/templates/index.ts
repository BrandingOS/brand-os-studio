// Variable-Based Template System — Public API

// Types
export type {
  TemplateDefinition,
  TemplateMeta,
  TemplateType,
  TemplateCanvas,
  TemplatePage,
  TemplateElement,
  TextElement,
  ShapeElement,
  ImageElement,
  LogoElement,
  DividerElement,
  TemplateVariable,
  TemplateAuthor,
  ResolvedTemplate,
} from './types';

// Engine
export { resolveTemplate, buildVariableMap, interpolateString, hasVariables } from './engine';

// Renderers
export { DomRenderer } from './renderers/DomRenderer';
export { renderToFabric, extractFromFabric } from './renderers/FabricRenderer';

// Store
export { useTemplateStore } from './store/templateStore';

// Hooks
export { useResolvedTemplate } from './hooks/useResolvedTemplate';

// Variables
export { BRAND_VARIABLES, getVariablesByCategory } from './variables/schema';
