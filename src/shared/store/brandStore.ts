import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Brand, CreateBrandInput } from '../types/brand';

interface BrandStore {
  list: Brand[];
  current?: Brand;
  isLoading: boolean;
  error?: string;
  
  // Actions
  loadById: (id: string) => Promise<void>;
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
    (set, get) => ({
      list: [],
      current: undefined,
      isLoading: false,
      error: undefined,

      loadById: async (id: string) => {
        set({ isLoading: true, error: undefined }, false, 'loadById/start');
        try {
          // This will be implemented by the service layer
          const { getBrandService } = await import('../services/brandService');
          const service = await getBrandService();
          const brand = await service.getById(id);
          set({ current: brand, isLoading: false }, false, 'loadById/success');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load brand', 
            isLoading: false 
          }, false, 'loadById/error');
        }
      },

      create: async (input: CreateBrandInput) => {
        set({ isLoading: true, error: undefined }, false, 'create/start');
        try {
          const { getBrandService } = await import('../services/brandService');
          const service = await getBrandService();
          const brand = await service.create(input);
          
          set((state) => ({
            list: [...state.list, brand],
            current: brand,
            isLoading: false
          }), false, 'create/success');
          
          return brand;
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to create brand', 
            isLoading: false 
          }, false, 'create/error');
          throw error;
        }
      },

      update: async (id: string, patch: Partial<Brand>) => {
        set({ isLoading: true, error: undefined }, false, 'update/start');
        try {
          const { getBrandService } = await import('../services/brandService');
          const service = await getBrandService();
          await service.update(id, patch);
          
          set((state) => ({
            list: state.list.map(brand => 
              brand.id === id ? { ...brand, ...patch, updatedAt: new Date() } : brand
            ),
            current: state.current?.id === id 
              ? { ...state.current, ...patch, updatedAt: new Date() } 
              : state.current,
            isLoading: false
          }), false, 'update/success');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to update brand', 
            isLoading: false 
          }, false, 'update/error');
        }
      },

      delete: async (id: string) => {
        set({ isLoading: true, error: undefined }, false, 'delete/start');
        try {
          const { getBrandService } = await import('../services/brandService');
          const service = await getBrandService();
          await service.delete(id);
          
          set((state) => ({
            list: state.list.filter(brand => brand.id !== id),
            current: state.current?.id === id ? undefined : state.current,
            isLoading: false
          }), false, 'delete/success');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to delete brand', 
            isLoading: false 
          }, false, 'delete/error');
        }
      },

      loadAll: async () => {
        set({ isLoading: true, error: undefined }, false, 'loadAll/start');
        try {
          const { getBrandService } = await import('../services/brandService');
          const service = await getBrandService();
          const brands = await service.getAll();
          set({ list: brands, isLoading: false }, false, 'loadAll/success');
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to load brands', 
            isLoading: false 
          }, false, 'loadAll/error');
        }
      },

      setCurrent: (brand: Brand | undefined) => {
        set({ current: brand }, false, 'setCurrent');
      },

      setError: (error: string | undefined) => {
        set({ error }, false, 'setError');
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading }, false, 'setLoading');
      },
    }),
    { name: 'brand-store' }
  )
);