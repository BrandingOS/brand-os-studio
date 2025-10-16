import { useEffect } from 'react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { DEV_MODE, DEV_USER } from '@/config/devMode';
import type { User } from '@/shared/types/user';

export const useAutoLogin = () => {
  const { signIn, isAuthenticated, isDevMode } = useSessionStore();

  useEffect(() => {
    // Only auto-login in development and if not already authenticated
    if (DEV_MODE && !isAuthenticated) {
      signIn(DEV_USER as User, true); // Mark as dev mode
    }
  }, [signIn, isAuthenticated]);

  return {
    isDevelopmentMode: DEV_MODE,
    isAutoLogin: DEV_MODE && isAuthenticated,
    isDevMode
  };
};