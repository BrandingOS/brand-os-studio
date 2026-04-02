import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useBrandStore } from '@/shared/store/brandStore';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IBrandsService } from '@/core/types/services';

/**
 * useDataSync — orchestrates data synchronization between auth modes.
 *
 * Uses the DI container to access services instead of directly
 * instantiating LocalBrandsService / SupabaseBrandsService.
 */
export const useDataSync = () => {
  const { isAuthenticated } = useAuth();
  const { mode, previousMode } = useSessionStore();
  const onboardingStore = useOnboardingStore();
  const { loadAll } = useBrandStore();

  useEffect(() => {
    const handleModeChange = async () => {
      // When switching from guest to authenticated user
      if (mode === 'user' && previousMode === 'guest') {
        try {
          if (typeof onboardingStore.syncToSupabase === 'function') {
            await onboardingStore.syncToSupabase();
          }
          await loadAll();
        } catch (error) {
          console.error('[useDataSync] Failed to sync data:', error);
        }
      }

      // When authenticated, load data
      if (mode === 'user' && isAuthenticated) {
        try {
          if (typeof onboardingStore.loadFromSupabase === 'function') {
            await onboardingStore.loadFromSupabase();
          }
          await loadAll();
        } catch (error) {
          console.error('[useDataSync] Failed to load data:', error);
        }
      }
    };

    handleModeChange();
  }, [mode, previousMode, isAuthenticated, onboardingStore, loadAll]);
};
