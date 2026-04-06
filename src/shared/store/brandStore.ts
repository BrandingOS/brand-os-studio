import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';
import type { Brand, CreateBrandInput } from '../types/brand';
import { loadBrandFonts } from '@/shared/design-system/fonts';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';

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
          if (patch.fonts || patch.primaryColor || patch.secondaryColor) {
            const next = { ...(useBrandStore.getState().current ?? {}), ...patch } as Brand;
            loadBrandFonts(next);
            applyBrandTokens(next);
          }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to update brand', isLoading: false }, false, 'update/error');
        }
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
