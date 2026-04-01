import { useEffect } from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useBrandStore } from '@/shared/store/brandStore';

/**
 * Hook to handle data synchronization between guest and authenticated modes.
 * In dev mode, no sync is needed since we skip Supabase entirely.
 */
export const useDataSync = () => {
  const { isAuthenticated } = useAuth();
  const { mode, previousMode } = useSessionStore();
  const onboardingStore = useOnboardingStore();
  const { loadAll } = useBrandStore();

  useEffect(() => {
    // Skip sync in dev mode (no real Supabase connection)
    if (import.meta.env.DEV) return;

    const handleModeChange = async () => {
      // When switching from guest to authenticated
      if (mode === 'user' && previousMode === 'guest') {
        try {
          if (typeof onboardingStore.syncToSupabase === 'function') {
            await onboardingStore.syncToSupabase();
          }
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
