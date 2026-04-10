/**
 * Template Resolution Engine
 *
 * Takes a TemplateDefinition + Brand + content overrides → ResolvedTemplate
 * where every {{variable}} has been replaced with concrete values.
 *
 * This is a pure function — no side effects, memoizable, instant (<1ms).
 */
import type { Brand } from '@/shared/types/brand';
import type { TemplateDefinition, ResolvedTemplate, TemplatePage } from '../types';
import { buildVariableMap } from './variableMap';
import { interpolateDeep } from './interpolate';

interface ResolveInput {
  template: TemplateDefinition;
  brand: Brand;
  contentOverrides?: Record<string, string>;
}

/**
 * Resolve a template against a brand.
 *
 * 1. Build variable map from brand data
 * 2. Merge with content overrides (user-editable fields)
 * 3. Deep-interpolate all string values in the template
 * 4. Return the resolved template ready to render
 */
export function resolveTemplate({ template, brand, contentOverrides }: ResolveInput): ResolvedTemplate {
  // Step 1: Build the variable map from brand data
  const brandVars = buildVariableMap(brand);

  // Step 2: Add content variable defaults from the template
  const contentVars: Record<string, string> = {};
  for (const v of template.variables) {
    if (v.source === 'content') {
      contentVars[v.path] = v.defaultValue;
    }
  }

  // Step 3: Merge — content overrides take priority
  const allVars: Record<string, string> = {
    ...brandVars,
    ...contentVars,
    ...(contentOverrides
      ? Object.fromEntries(
          Object.entries(contentOverrides).map(([k, v]) => [
            k.startsWith('content.') ? k : `content.${k}`,
            v,
          ]),
        )
      : {}),
  };

  // Step 4: Deep-interpolate the template pages
  const resolvedPages = interpolateDeep<TemplatePage[]>(template.pages, allVars);

  return {
    meta: template.meta,
    canvas: template.canvas,
    pages: resolvedPages,
  };
}
