import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import { demoBrandIdentity } from '@/data/demo';

export interface BrandsService {
  list(): Promise<Brand[]>;
  getById(id: string): Promise<Brand | null>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  delete(id: string): Promise<void>;
}

export class LocalBrandsService implements BrandsService {
  private readonly storageKey = 'brandos:brands';

  private getBrands(): Brand[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      const brands = data ? JSON.parse(data) : [];

      // Initialize with demo data if no brands exist
      if (brands.length === 0) {
        const demoData = [demoBrandIdentity];
        this.saveBrands(demoData);
        return demoData;
      }

      return brands;
    } catch {
      return [];
    }
  }

  private saveBrands(brands: Brand[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(brands));
  }

  async list(): Promise<Brand[]> {
    return this.getBrands();
  }

  async getById(id: string): Promise<Brand | null> {
    const brands = this.getBrands();
    return brands.find(b => b.id === id) || null;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    const brands = this.getBrands();
    return brands.find(b => b.slug === slug) || null;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const brands = this.getBrands();

    const brand: Brand = {
      ...input,
      id: `brand_${Date.now()}`,
      slug: input.slug || this.generateSlug(input.name),
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newBrands = [...brands, brand];
    this.saveBrands(newBrands);
    return brand;
  }

  async update(id: string, patch: Partial<Brand>): Promise<Brand> {
    const brands = this.getBrands();
    const index = brands.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Brand with id ${id} not found`);
    
    const updatedBrand = { ...brands[index], ...patch, updatedAt: new Date() };
    brands[index] = updatedBrand;
    this.saveBrands(brands);
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
    const brands = this.getBrands();
    const filtered = brands.filter(b => b.id !== id);
    this.saveBrands(filtered);
  }
}

// Export singleton instance
export const brandsService = new LocalBrandsService();