import type { Brand, CreateBrandInput } from '@/shared/types/brand';

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
        const { demoBrandIdentity } = require('@/data/demo');
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

  async create(input: CreateBrandInput): Promise<Brand> {
    const brands = this.getBrands();
    
    // For guest users, replace existing brand
    if (brands.length >= 1) {
      this.saveBrands([]);
    }

    const brand: Brand = {
      ...input,
      id: `brand_${Date.now()}`,
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newBrands = [brand];
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

  async delete(id: string): Promise<void> {
    const brands = this.getBrands();
    const filtered = brands.filter(b => b.id !== id);
    this.saveBrands(filtered);
  }
}

// Export singleton instance
export const brandsService = new LocalBrandsService();