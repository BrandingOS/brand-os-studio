import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useBrandStore } from '@/shared/store/brandStore';
import { LocalBrandsService } from '@/features/brand/services/brands.local';
import { SupabaseBrandsService } from '@/shared/services/brands.supabase';

/**
 * Hook to handle data synchronization between guest and authenticated modes
 */
export const useDataSync = () => {
  const { isAuthenticated } = useAuth();
  const { mode, previousMode } = useSessionStore();
  const onboardingStore = useOnboardingStore();
  const { loadAll } = useBrandStore();

  useEffect(() => {
    const handleModeChange = async () => {
      // When switching from guest to authenticated
      if (mode === 'user' && previousMode === 'guest') {
        try {
          // Sync onboarding data (if available)
          if (typeof onboardingStore.syncToSupabase === 'function') {
            await onboardingStore.syncToSupabase();
          }
          
          // Sync brand data
          const localService = new LocalBrandsService();
          const supabaseService = new SupabaseBrandsService();
          
          const localBrands = await localService.list();
          
          // Create brands in Supabase
          for (const brand of localBrands) {
            try {
              await supabaseService.create({
                name: brand.name,
                logo: brand.logo,
                primaryColor: brand.primaryColor,
                secondaryColor: brand.secondaryColor,
                fonts: brand.fonts,
                tone: brand.tone,
                audience: brand.audience,
              });
            } catch (error) {
              console.error('Failed to sync brand:', error);
            }
          }
          
          // Clear local storage after successful sync
          await localService.delete(localBrands[0]?.id);
          
          // Reload brands from Supabase
          await loadAll();
          
        } catch (error) {
          console.error('Failed to sync data to Supabase:', error);
        }
      }
      
      // When switching to authenticated mode, load data from Supabase
      if (mode === 'user' && isAuthenticated) {
        try {
          if (typeof onboardingStore.loadFromSupabase === 'function') {
            await onboardingStore.loadFromSupabase();
          }
          await loadAll();
        } catch (error) {
          console.error('Failed to load data from Supabase:', error);
        }
      }
    };

    handleModeChange();
  }, [mode, previousMode, isAuthenticated, onboardingStore, loadAll]);
};