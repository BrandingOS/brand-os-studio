import type { Brand } from '@/shared/types/brand';

export interface BrandsService {
  list(): Promise<Brand[]>;
  getById(id: string): Promise<Brand | null>;
  getBySlug(slug: string): Promise<Brand | null>;
  create(brand: Partial<Brand>): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  delete(id: string): Promise<void>;
}

// Interface only - implementations will be added later