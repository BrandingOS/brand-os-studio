import { ReactNode, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSessionStore } from '@/shared/store/sessionStore';

const AUTH_BYPASS = import.meta.env.VITE_AUTH_BYPASS === 'true';

/** Dev-mode fake user injected when VITE_AUTH_BYPASS=true. */
const DEV_USER = {
  id: 'dev-user-000',
  email: 'dev@brandos.local',
  name: 'Dev User',
  avatar: undefined,
  plan: 'free' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize real auth
  useAuth();

  // When bypass is on, immediately inject a dev user so every component
  // that checks isAuthenticated / reads user works without Supabase.
  useEffect(() => {
    if (AUTH_BYPASS) {
      const { signIn, setLoading, setAdmin } = useSessionStore.getState();
      signIn(DEV_USER);
      setAdmin(true);
      setLoading(false);
    }
  }, []);

  return <>{children}</>;
}
