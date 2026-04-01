import type { BrandsService } from './brands.service';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { SupabaseBrandsService } from './brands.supabase';
import { useSessionStore } from '@/shared/store/sessionStore';
import { supabase } from '@/integrations/supabase/client';

export interface Services {
  brands: BrandsService;
}

// Check if we have a real Supabase session (async initialization)
let hasSupabaseSession = false;
let sessionCheckPromise: Promise<void> | null = null;

async function initializeSessionCheck() {
  if (sessionCheckPromise) return sessionCheckPromise;
  
  sessionCheckPromise = (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      hasSupabaseSession = !!data.session?.user;
    } catch {
      hasSupabaseSession = false;
    }
  })();
  
  return sessionCheckPromise;
}

// Initialize on module load
initializeSessionCheck();

// Listen for auth changes to update session state
supabase.auth.onAuthStateChange((event, session) => {
  hasSupabaseSession = !!session?.user;
});

export function createServices(): Services {
  return {
    get brands(): BrandsService {
      // Dev mode: always use localStorage (no Supabase connection)
      if (import.meta.env.DEV) return new LocalBrandsService();

      const { mode, isAuthenticated } = useSessionStore.getState();

      // Guest mode always uses local storage
      if (mode === 'guest') {
        return new LocalBrandsService();
      }

      // For user mode (real authentication), always use Supabase
      if (mode === 'user' && isAuthenticated) {
        return new SupabaseBrandsService();
      }

      // Fallback to local storage
      return new LocalBrandsService();
    }
  };
}

// Global services instance
export const services = createServices();