import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import { demoBrandIdentity } from '@/data/demo';
import { raqmBrand } from '@/data/brands/raqm';
import { skamBrand } from '@/data/brands/skam';
import { vectorBrand } from '@/data/brands/vector';
import { safeLocalStorageSet } from '@/shared/utils/imageUpload';

export interface BrandsService {
  list(): Promise<Brand[]>;
  getById(id: string): Promise<Brand | null>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  delete(id: string): Promise<void>;
}

/**
 * Seed brands are always available as proper in-app data.
 * They are NOT stored in localStorage — they're merged at read time
 * from the app's seed data modules so they always exist regardless
 * of browser storage state.
 */
const SEED_BRANDS: Brand[] = [raqmBrand, skamBrand, vectorBrand, demoBrandIdentity];
const SEED_BRAND_IDS = new Set(SEED_BRANDS.map(b => b.id));

export class LocalBrandsService implements BrandsService {
  private readonly storageKey = 'brandos:brands';

  private getUserBrands(): Brand[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private getAllBrands(): Brand[] {
    const userBrands = this.getUserBrands();
    // Merge: seed brands that aren't overridden in localStorage + user brands
    const userBrandIds = new Set(userBrands.map(b => b.id));
    const missingSeeds = SEED_BRANDS.filter(sb => !userBrandIds.has(sb.id));
    return [...missingSeeds, ...userBrands];
  }

  async list(): Promise<Brand[]> {
    return this.getAllBrands();
  }

  async getById(id: string): Promise<Brand | null> {
    const brands = this.getAllBrands();
    return brands.find(b => b.id === id) || null;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    const brands = this.getAllBrands();
    return brands.find(b => b.slug === slug) || null;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const userBrands = this.getUserBrands();
    const brand: Brand = {
      ...input,
      id: `brand_${Date.now()}`,
      slug: input.slug || this.generateSlug(input.name),
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = safeLocalStorageSet(this.storageKey, JSON.stringify([...userBrands, brand]));
    if (!result.success) throw new Error(result.error);
    return brand;
  }

  async update(id: string, patch: Partial<Brand>): Promise<Brand> {
    const allBrands = this.getAllBrands();
    const index = allBrands.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Brand with id ${id} not found`);
    const updatedBrand = { ...allBrands[index], ...patch, updatedAt: new Date() };

    // For seed brands being edited for the first time, persist the modified
    // version to localStorage so user edits survive refreshes.
    const userBrands = this.getUserBrands();
    const userIdx = userBrands.findIndex(b => b.id === id);
    if (userIdx >= 0) {
      userBrands[userIdx] = updatedBrand;
    } else {
      userBrands.push(updatedBrand);
    }
    const result = safeLocalStorageSet(this.storageKey, JSON.stringify(userBrands));
    if (!result.success) throw new Error(result.error);
    return updatedBrand;
  }

  private generateSlug(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
  }

  async delete(id: string): Promise<void> {
    if (SEED_BRAND_IDS.has(id)) return; // Cannot delete seed brands
    const userBrands = this.getUserBrands();
    safeLocalStorageSet(this.storageKey, JSON.stringify(userBrands.filter(b => b.id !== id)));
  }
}

export const brandsService = new LocalBrandsService();
