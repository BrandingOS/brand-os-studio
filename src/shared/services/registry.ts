import type { BrandsService } from './brands.service';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { SupabaseBrandsService } from './brands.supabase';
import { useSessionStore } from '@/shared/store/sessionStore';
import { supabase } from '@/integrations/supabase/client';

export interface Services {
  brands: BrandsService;
}

// Cache to store the last known Supabase user state
let cachedSupabaseUser: any = null;
let lastCheck = 0;
const CACHE_DURATION = 1000; // 1 second cache

export function createServices(): Services {
  return {
    get brands(): BrandsService {
      const { mode } = useSessionStore.getState();
      
      // If guest mode, always use local service
      if (mode === 'guest') {
        return new LocalBrandsService();
      }
      
      // For user mode, check if there's a real Supabase session
      // Use cached value if available and recent
      const now = Date.now();
      if (now - lastCheck < CACHE_DURATION && cachedSupabaseUser !== null) {
        return cachedSupabaseUser ? new SupabaseBrandsService() : new LocalBrandsService();
      }
      
      // Check synchronously if possible (will be null in dev mode)
      const session = supabase.auth.getSession();
      
      // For dev mode with auto-login (no real Supabase session), use local service
      session.then(({ data }) => {
        cachedSupabaseUser = data.session?.user || null;
        lastCheck = now;
      });
      
      // Default to local service for dev mode
      return cachedSupabaseUser ? new SupabaseBrandsService() : new LocalBrandsService();
    }
  };
}

// Global services instance
export const services = createServices();