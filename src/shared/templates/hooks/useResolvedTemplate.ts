/**
 * useResolvedTemplate — memoized hook that resolves a template against a brand.
 *
 * Re-resolves when the template, brand, or content overrides change.
 * Returns the resolved template ready for rendering.
 */
import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateDefinition, ResolvedTemplate } from '../types';
import { resolveTemplate } from '../engine/resolve';

export function useResolvedTemplate(
  template: TemplateDefinition | null | undefined,
  brand: Brand | null | undefined,
  contentOverrides?: Record<string, string>,
): ResolvedTemplate | null {
  return useMemo(() => {
    if (!template || !brand) return null;
    return resolveTemplate({ template, brand, contentOverrides });
  }, [template, brand, contentOverrides]);
}
