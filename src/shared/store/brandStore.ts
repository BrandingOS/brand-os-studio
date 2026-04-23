import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';
import type { Brand, CreateBrandInput } from '../types/brand';
import { loadBrandFonts } from '@/shared/design-system/fonts';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';
import type { Typescale } from '@/shared/types/typescale';
import type { TypographySystem, FontToken, FontScaleTokens } from '@/shared/types/brandAssets';

/**
 * Helper to get the brands service from the DI container.
 * This is the ONLY place the store touches the service layer.
 */
function getBrandsService(): IBrandsService {
  return container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
}

interface BrandStore {
  list: Brand[];
  current?: Brand;
  isLoading: boolean;
  error?: string;

  loadById: (id: string) => Promise<void>;
  loadBySlug: (slug: string) => Promise<void>;
  create: (input: CreateBrandInput) => Promise<Brand>;
  update: (id: string, patch: Partial<Brand>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  loadAll: () => Promise<void>;
  setCurrent: (brand: Brand | undefined) => void;
  setError: (error: string | undefined) => void;
  setLoading: (loading: boolean) => void;
  setTypescale: (brandId: string, next: Typescale) => Promise<void>;
}

function fallbacksFromString(fallback: string): string[] {
  return fallback.split(',').map(s => s.trim()).filter(Boolean);
}

function fontTokenFromRef(ref: { family: string; weights: number[]; fallback: string; files?: { url: string }[] }): FontToken {
  return {
    family: ref.family,
    weights: ref.weights,
    fallbacks: fallbacksFromString(ref.fallback),
    url: ref.files?.[0]?.url,
  };
}

export function mirrorTypographyFromTypescale(
  current: TypographySystem | undefined,
  next: Typescale,
): TypographySystem {
  const web = next.surfaces.web;
  const byId = new Map(web.steps.map(s => [s.id, s]));
  const pick = (role: keyof typeof web.semantic): string | undefined => {
    const entry = web.semantic[role];
    if (!entry) return undefined;
    const step = byId.get(entry.stepId);
    return step ? `${step.sizePx}px` : undefined;
  };
  const scale: FontScaleTokens = {
    h1: pick('h1'),
    h2: pick('h2'),
    h3: pick('h3'),
    h4: pick('h4'),
    h5: pick('h5'),
    h6: pick('h6'),
    body: pick('body'),
    bodyLarge: pick('bodyLg'),
    bodySmall: pick('bodySm'),
    caption: pick('caption'),
    overline: pick('overline'),
  };
  return {
    ...(current ?? {}),
    primary: fontTokenFromRef(next.fonts.heading),
    secondary: fontTokenFromRef(next.fonts.body),
    accent: next.fonts.mono ? fontTokenFromRef(next.fonts.mono) : current?.accent,
    scale,
  };
}

export const useBrandStore = create<BrandStore>()(
  devtools(
    (set) => ({
      list: [],
      current: undefined,
      isLoading: false,
      error: undefined,

      loadById: async (id: string) => {
        set({ isLoading: true, error: undefined }, false, 'loadById/start');
        try {
          const brand = await getBrandsService().getById(id);
          set({ current: brand ?? undefined, isLoading: false }, false, 'loadById/success');
          if (brand) { loadBrandFonts(brand); applyBrandTokens(brand); }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load brand', isLoading: false }, false, 'loadById/error');
        }
      },

      loadBySlug: async (slug: string) => {
        set({ isLoading: true, error: undefined }, false, 'loadBySlug/start');
        try {
          const brand = await getBrandsService().getBySlug(slug);
          set({ current: brand ?? undefined, isLoading: false }, false, 'loadBySlug/success');
          if (brand) { loadBrandFonts(brand); applyBrandTokens(brand); }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load brand', isLoading: false }, false, 'loadBySlug/error');
        }
      },

      create: async (input: CreateBrandInput) => {
        set({ isLoading: true, error: undefined }, false, 'create/start');
        try {
          const brand = await getBrandsService().create(input);
          set((state) => ({
            list: [...state.list, brand],
            current: brand,
            isLoading: false,
          }), false, 'create/success');
          return brand;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create brand', isLoading: false }, false, 'create/error');
          throw error;
        }
      },

      update: async (id: string, patch: Partial<Brand>) => {
        set({ isLoading: true, error: undefined }, false, 'update/start');
        try {
          await getBrandsService().update(id, patch);
          set((state) => ({
            list: state.list.map(brand =>
              brand.id === id ? { ...brand, ...patch, updatedAt: new Date() } : brand
            ),
            current: state.current?.id === id
              ? { ...state.current, ...patch, updatedAt: new Date() }
              : state.current,
            isLoading: false,
          }), false, 'update/success');
          if (patch.fonts || patch.primaryColor || patch.secondaryColor || patch.typescale || patch.typography) {
            const next = { ...(useBrandStore.getState().current ?? {}), ...patch } as Brand;
            loadBrandFonts(next);
            applyBrandTokens(next);
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update brand', isLoading: false }, false, 'update/error');
        }
      },

      setTypescale: async (brandId: string, next: Typescale) => {
        const current = useBrandStore.getState().list.find(b => b.id === brandId)
                      ?? (useBrandStore.getState().current?.id === brandId ? useBrandStore.getState().current : undefined);
        const typography = mirrorTypographyFromTypescale(current?.typography, next);
        await useBrandStore.getState().update(brandId, { typescale: next, typography });
      },

      delete: async (id: string) => {
        set({ isLoading: true, error: undefined }, false, 'delete/start');
        try {
          await getBrandsService().delete(id);
          set((state) => ({
            list: state.list.filter(brand => brand.id !== id),
            current: state.current?.id === id ? undefined : state.current,
            isLoading: false,
          }), false, 'delete/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete brand', isLoading: false }, false, 'delete/error');
        }
      },

      loadAll: async () => {
        set({ isLoading: true, error: undefined }, false, 'loadAll/start');
        try {
          const brands = await getBrandsService().list();
          set({ list: brands, isLoading: false }, false, 'loadAll/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load brands', isLoading: false }, false, 'loadAll/error');
        }
      },

      setCurrent: (brand) => set({ current: brand }, false, 'setCurrent'),
      setError: (error) => set({ error }, false, 'setError'),
      setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
    }),
    { name: 'brand-store' }
  )
);
