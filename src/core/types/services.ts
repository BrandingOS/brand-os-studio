/**
 * Service contracts for BrandOS.
 *
 * These interfaces define the API between the UI layer and the data layer.
 * Implementations can be:
 *   - LocalBrandsService (localStorage, dev/guest mode)
 *   - SupabaseBrandsService (production, authenticated)
 *   - MockBrandsService (testing)
 *
 * The UI layer NEVER imports a concrete implementation directly.
 * It accesses services via the ServiceContainer or the useService() hook.
 */

import type { Brand, CreateBrandInput } from '@/shared/types/brand';

// ─── Brand Service ─────────────────────────────────────────────

export interface IBrandsService {
  list(): Promise<Brand[]>;
  getById(id: string): Promise<Brand | null>;
  getBySlug(slug: string): Promise<Brand | null>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  delete(id: string): Promise<void>;
}

// ─── Storage Service ───────────────────────────────────────────

export interface IStorageService {
  uploadFile(path: string, file: File): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getPublicUrl(path: string): string;
}

// ─── Design Storage ────────────────────────────────────────────

export interface IDesignStorage {
  saveDesign(brandId: string, designId: string, data: unknown): Promise<void>;
  loadDesign(brandId: string, designId: string): Promise<unknown | null>;
  listDesigns(brandId: string): Promise<string[]>;
  deleteDesign(brandId: string, designId: string): Promise<void>;
}

// ─── Service Keys ──────────────────────────────────────────────
// Type-safe keys for the ServiceContainer

export const SERVICE_KEYS = {
  BRANDS: 'brands',
  STORAGE: 'storage',
  DESIGN_STORAGE: 'designStorage',
} as const;
