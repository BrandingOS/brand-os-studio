import type { BrandsService } from './brands.service';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { SupabaseBrandsService } from './brands.supabase';
import { useSessionStore } from '@/shared/store/sessionStore';

export interface Services {
  brands: BrandsService;
}

export function createServices(): Services {
  return {
    get brands(): BrandsService {
      const { mode } = useSessionStore.getState();
      return mode === 'user' 
        ? new SupabaseBrandsService() 
        : new LocalBrandsService();
    }
  };
}

// Global services instance
export const services = createServices();