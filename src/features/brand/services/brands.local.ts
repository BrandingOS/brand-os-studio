import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import { demoBrandIdentity } from '@/data/demo';

export interface BrandsService {
  list(): Promise<Brand[]>;
  getById(id: string): Promise<Brand | null>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  delete(id: string): Promise<void>;
}

/**
 * The Meridian seed brand is always available as proper in-app data.
 * It is NOT stored in localStorage — it's merged at read time from
 * the app's seed data module so it always exists regardless of
 * browser storage state.
 */
const SEED_BRAND_ID = demoBrandIdentity.id;

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
    // Always include the seed brand, merged with user brands
    const hasSeedBrand = userBrands.some(b => b.id === SEED_BRAND_ID);
    if (hasSeedBrand) {
      return userBrands;
    }
    return [demoBrandIdentity, ...userBrands];
  }

  private saveUserBrands(brands: Brand[]): void {
    // Only persist user-created brands (not the seed brand) to localStorage
    const userOnly = brands.filter(b => b.id !== SEED_BRAND_ID);
    localStorage.setItem(this.storageKey, JSON.stringify(userOnly));
  }

  async list(): Promise<Brand[]> {
    return this.getAllBrands();
  }

  async getById(id: string): Promise<Brand | null> {
    // Check seed brand first
    if (id === SEED_BRAND_ID) return demoBrandIdentity;
    const brands = this.getAllBrands();
    return brands.find(b => b.id === id) || null;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    // Check seed brand first
    if (slug === demoBrandIdentity.slug) return demoBrandIdentity;
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

    const newBrands = [...userBrands, brand];
    localStorage.setItem(this.storageKey, JSON.stringify(newBrands));
    return brand;
  }

  async update(id: string, patch: Partial<Brand>): Promise<Brand> {
    const brands = this.getAllBrands();
    const index = brands.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Brand with id ${id} not found`);

    const updatedBrand = { ...brands[index], ...patch, updatedAt: new Date() };

    if (id === SEED_BRAND_ID) {
      // If updating the seed brand, persist it to localStorage so edits are saved
      const userBrands = this.getUserBrands();
      localStorage.setItem(this.storageKey, JSON.stringify([updatedBrand, ...userBrands]));
    } else {
      const allBrands = this.getAllBrands();
      allBrands[index] = updatedBrand;
      this.saveUserBrands(allBrands);
    }
    return updatedBrand;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }

  async delete(id: string): Promise<void> {
    if (id === SEED_BRAND_ID) return; // Cannot delete the seed brand
    const userBrands = this.getUserBrands();
    const filtered = userBrands.filter(b => b.id !== id);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }
}

// Export singleton instance
export const brandsService = new LocalBrandsService();
