import type { Brand, CreateBrandInput } from '../types/brand';
import { useSessionStore } from '../store/sessionStore';

export interface BrandService {
  getAll(): Promise<Brand[]>;
  getById(id: string): Promise<Brand>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Guest implementation using localStorage
class BrandServiceGuest implements BrandService {
  private readonly storageKey = 'brandos:brands';

  private getBrands(): Brand[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveBrands(brands: Brand[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(brands));
  }

  async getAll(): Promise<Brand[]> {
    return this.getBrands();
  }

  async getById(id: string): Promise<Brand> {
    const brands = this.getBrands();
    const brand = brands.find(b => b.id === id);
    if (!brand) throw new Error(`Brand with id ${id} not found`);
    return brand;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const brands = this.getBrands();
    
    // Guest users can only have one brand - replace existing one
    console.log('Creating brand for guest, existing brands:', brands.length);
    if (brands.length >= 1) {
      console.log('Replacing existing brand for guest user');
      // Clear existing brands for guest users
      this.saveBrands([]);
    }

    const brand: Brand = {
      ...input,
      id: `brand_${Date.now()}`,
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Created brand:', brand);
    const newBrands = [brand]; // Only keep the new brand for guest users
    this.saveBrands(newBrands);
    return brand;
  }

  async update(id: string, patch: Partial<Brand>): Promise<void> {
    const brands = this.getBrands();
    const index = brands.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Brand with id ${id} not found`);
    
    brands[index] = { ...brands[index], ...patch, updatedAt: new Date() };
    this.saveBrands(brands);
  }

  async delete(id: string): Promise<void> {
    const brands = this.getBrands();
    const filtered = brands.filter(b => b.id !== id);
    this.saveBrands(filtered);
  }
}

// Mock implementation for authenticated users
class BrandServiceMock implements BrandService {
  private brands = new Map<string, Brand>();

  async getAll(): Promise<Brand[]> {
    return Array.from(this.brands.values());
  }

  async getById(id: string): Promise<Brand> {
    const brand = this.brands.get(id);
    if (!brand) throw new Error(`Brand with id ${id} not found`);
    return brand;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const brand: Brand = {
      ...input,
      id: `brand_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.brands.set(brand.id, brand);
    return brand;
  }

  async update(id: string, patch: Partial<Brand>): Promise<void> {
    const brand = this.brands.get(id);
    if (!brand) throw new Error(`Brand with id ${id} not found`);
    
    this.brands.set(id, { ...brand, ...patch, updatedAt: new Date() });
  }

  async delete(id: string): Promise<void> {
    this.brands.delete(id);
  }
}

// Service factory
export function getBrandService(): BrandService {
  const { mode } = useSessionStore.getState();
  return mode === 'guest' ? new BrandServiceGuest() : new BrandServiceMock();
}