import type { BrandsService } from './brands.service';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { SupabaseBrandsService } from './brands.supabase';
import { useSessionStore } from '@/shared/store/sessionStore';
import { supabase } from '@/integrations/supabase/client';

export interface Services {
  brands: BrandsService;
}

export function createServices(): Services {
  return {
    get brands(): BrandsService {
      const { mode } = useSessionStore.getState();
      
      // Always use local service in guest mode or dev mode
      // Dev mode uses auto-login which doesn't have a real Supabase session
      return mode === 'guest' 
        ? new LocalBrandsService()
        : new LocalBrandsService(); // Always use local for now since dev mode doesn't have real auth
    }
  };
}

// Global services instance
export const services = createServices();