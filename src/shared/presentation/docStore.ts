/**
 * Unified Document Store Facade
 *
 * Provides ONE API for working with presentation documents regardless of
 * which surface (presentations, logo-presentation, social-media, brand-guide)
 * they live in. Internally delegates to the existing per-surface stores
 * (presentationDocsStore, logoPresentationDocsStore) so no persisted user
 * data is touched.
 *
 * This is the migration path: new code uses `useDocStore(surface)` and gets
 * a stable, surface-agnostic API. Existing code using the underlying stores
 * keeps working unchanged.
 *
 * Adding a new surface in the future = register it here, point at any
 * underlying persistence (or create a new one). Consumers don't change.
 */

import { usePresentationDocsStore } from './presentationDocsStore';
import { useLogoPresentationDocsStore } from '@/features/logo-presentation/docsStore';

export type DocSurface = 'presentations' | 'logo-presentation' | 'social-media' | 'brand-guide';

/** Common shape every surface's document satisfies. */
export interface UnifiedDoc {
  id: string;
  brandId: string;
  name: string;
  slideOverrides: Record<string, Record<string, unknown>>;
  extraSlides: Array<{ id: string; layout: string; data: Record<string, unknown> }>;
  hiddenSlideIds: string[];
  /** Surface-specific data (concepts for logo, contentType for presentations, etc.) */
  featureData?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface DocStoreApi {
  list: (brandId: string) => UnifiedDoc[];
  get: (brandId: string, docId: string) => UnifiedDoc | undefined;
  rename: (brandId: string, docId: string, name: string) => void;
  remove: (brandId: string, docId: string) => void;
  setSlideOverride: (brandId: string, docId: string, slideId: string, override: Record<string, unknown>) => void;
  addExtraSlide: (brandId: string, docId: string, layout: string) => { id: string };
  removeExtraSlide: (brandId: string, docId: string, slideId: string) => void;
  hideSlide: (brandId: string, docId: string, slideId: string) => void;
  unhideSlide: (brandId: string, docId: string, slideId: string) => void;
  setActive: (brandId: string, docId: string | null) => void;
  getActive: (brandId: string) => string | null;
}

/**
 * Returns a surface-agnostic facade for the given surface. Pass this around
 * instead of importing the specific underlying store.
 *
 * Note: this is a plain function, not a hook — it's safe to call inside any
 * code path. The returned methods read from the live Zustand stores at call
 * time, so they always see fresh state.
 */
export function getDocStore(surface: DocSurface): DocStoreApi {
  if (surface === 'logo-presentation') {
    return {
      list: (brandId) => {
        const docs = useLogoPresentationDocsStore.getState().listForBrand(brandId);
        return docs.map((d) => ({
          id: d.id,
          brandId: d.brandId,
          name: d.name,
          slideOverrides: d.slideOverrides,
          extraSlides: d.extraSlides,
          hiddenSlideIds: d.hiddenSlideIds,
          featureData: {
            concepts: d.concepts,
            brief: d.brief,
            personality: d.personality,
            clientName: d.clientName,
            template: d.template,
          },
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }));
      },
      get: (brandId, docId) => {
        const d = useLogoPresentationDocsStore.getState().get(brandId, docId);
        if (!d) return undefined;
        return {
          id: d.id,
          brandId: d.brandId,
          name: d.name,
          slideOverrides: d.slideOverrides,
          extraSlides: d.extraSlides,
          hiddenSlideIds: d.hiddenSlideIds,
          featureData: {
            concepts: d.concepts,
            brief: d.brief,
            personality: d.personality,
            clientName: d.clientName,
            template: d.template,
          },
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      },
      rename: (b, d, n) => useLogoPresentationDocsStore.getState().rename(b, d, n),
      remove: (b, d) => useLogoPresentationDocsStore.getState().remove(b, d),
      setSlideOverride: (b, d, s, o) => useLogoPresentationDocsStore.getState().setSlideOverride(b, d, s, o),
      addExtraSlide: (b, d, layout) => useLogoPresentationDocsStore.getState().addExtraSlide(b, d, layout as any),
      removeExtraSlide: (b, d, s) => useLogoPresentationDocsStore.getState().removeExtraSlide(b, d, s),
      hideSlide: (b, d, s) => useLogoPresentationDocsStore.getState().hideSlide(b, d, s),
      unhideSlide: (b, d, s) => useLogoPresentationDocsStore.getState().unhideSlide(b, d, s),
      setActive: (b, d) => useLogoPresentationDocsStore.getState().setActive(b, d),
      getActive: (b) => useLogoPresentationDocsStore.getState().activeDocId[b] || null,
    };
  }

  // Default: presentations / brand-guide / social-media all share the same underlying store today.
  return {
    list: (brandId) => {
      const docs = usePresentationDocsStore.getState().listForBrand(brandId);
      return docs.map((d) => ({
        id: d.id,
        brandId: d.brandId,
        name: d.name,
        slideOverrides: d.slideOverrides as Record<string, Record<string, unknown>>,
        extraSlides: d.extraSlides as Array<{ id: string; layout: string; data: Record<string, unknown> }>,
        hiddenSlideIds: d.hiddenSlideIds,
        featureData: { styleId: d.styleId, contentType: d.contentType, settings: d.settings },
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
    },
    get: (brandId, docId) => {
      const d = usePresentationDocsStore.getState().get(brandId, docId);
      if (!d) return undefined;
      return {
        id: d.id,
        brandId: d.brandId,
        name: d.name,
        slideOverrides: d.slideOverrides as Record<string, Record<string, unknown>>,
        extraSlides: d.extraSlides as Array<{ id: string; layout: string; data: Record<string, unknown> }>,
        hiddenSlideIds: d.hiddenSlideIds,
        featureData: { styleId: d.styleId, contentType: d.contentType, settings: d.settings },
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      };
    },
    rename: (b, d, n) => usePresentationDocsStore.getState().rename(b, d, n),
    remove: (b, d) => usePresentationDocsStore.getState().remove(b, d),
    setSlideOverride: (b, d, s, o) => usePresentationDocsStore.getState().setSlideOverride(b, d, s, o as any),
    addExtraSlide: (b, d, layout) => usePresentationDocsStore.getState().addExtraSlide(b, d, layout as any),
    removeExtraSlide: (b, d, s) => usePresentationDocsStore.getState().removeExtraSlide(b, d, s),
    hideSlide: (b, d, s) => usePresentationDocsStore.getState().hideSlide(b, d, s),
    unhideSlide: (b, d, s) => usePresentationDocsStore.getState().unhideSlide(b, d, s),
    setActive: (b, d) => usePresentationDocsStore.getState().setActive(b, d),
    getActive: (b) => usePresentationDocsStore.getState().getActive(b),
  };
}
