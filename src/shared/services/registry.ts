import type { BrandsService } from './brands.service';

export interface Services {
  brands: BrandsService;
}

export function createServices(): Services {
  return {
    brands: null as any, // Placeholder - will be replaced with actual implementation
  };
}

// Global services instance - to be initialized with actual implementations
export const services = createServices();