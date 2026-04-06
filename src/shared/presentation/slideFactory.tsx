/**
 * slideFactory — single shared utility for building SlideData[].
 *
 * Replaces the duplicated `makeSlide` helpers in templates.tsx,
 * buildLogoSlides.tsx, buildSimpleLogoSlides.tsx, buildSocialSlides.tsx,
 * and guidelines/editor/buildSlides.tsx. All four builders can now produce
 * slides through one consistent API:
 *
 * ```ts
 * import { makeSlide } from '@/shared/presentation/slideFactory';
 *
 * slides.push(makeSlide({
 *   id: 'cover',
 *   name: 'Cover',
 *   Component: CoverPage,
 *   props: { title: 'Hello', subtitle: 'World' },
 *   overrides,                    // optional per-slide override map
 * }));
 * ```
 *
 * The factory handles override merging and the SlideRenderProps wiring
 * (brand, pageNumber, totalPages, settings) so callers don't have to
 * re-implement the same wrapper code per surface.
 */

import type { ComponentType } from 'react';
import type { SlideData, SlideRenderProps } from '@/shared/editor';
import type { PageProps } from './pages';

/** Per-slide override map. Keys are slide ids, values are partial PageProps. */
export type SlideOverridesMap = Record<string, Partial<Omit<PageProps, 'style' | 'brand' | 'pageNumber' | 'totalPages' | 'orientation' | 'aspectRatioValue' | 'settings'>>>;

/** Props the caller supplies to the factory — runtime props are injected at render. */
type StaticPageProps = Omit<PageProps, 'brand' | 'pageNumber' | 'totalPages' | 'orientation' | 'aspectRatioValue' | 'settings'>;

export interface MakeSlideArgs {
  id: string;
  name: string;
  Component: ComponentType<PageProps>;
  props: StaticPageProps;
  overrides?: SlideOverridesMap;
}

export function makeSlide({ id, name, Component, props, overrides }: MakeSlideArgs): SlideData {
  const merged = { ...props, ...(overrides?.[id] || {}) } as StaticPageProps;
  return {
    id,
    name,
    render: (rp: SlideRenderProps) => (
      <Component
        {...merged}
        brand={rp.brand}
        pageNumber={rp.pageNumber}
        totalPages={rp.totalPages}
        orientation={rp.orientation}
        aspectRatioValue={rp.aspectRatioValue}
        settings={rp.settings}
      />
    ),
  };
}

/**
 * Lightweight slide for surfaces that render their own custom React rather
 * than a pre-built layout (e.g. logo presentation cover with custom layout).
 * Use this when `makeSlide` doesn't fit because the slide isn't a PageProps layout.
 */
export interface MakeCustomSlideArgs {
  id: string;
  name: string;
  render: SlideData['render'];
}

export function makeCustomSlide({ id, name, render }: MakeCustomSlideArgs): SlideData {
  return { id, name, render };
}

/**
 * Apply hidden-slide and extra-slide filters to a built slide list.
 * Used by every surface to honor the doc store's `hiddenSlideIds` /
 * `extraSlides` arrays consistently.
 */
export function applyDocFilters(
  slides: SlideData[],
  opts: { hiddenSlideIds?: string[]; appendExtras?: SlideData[] } = {},
): SlideData[] {
  const hidden = new Set(opts.hiddenSlideIds ?? []);
  const visible = slides.filter((s) => !hidden.has(s.id));
  return opts.appendExtras ? [...visible, ...opts.appendExtras] : visible;
}
