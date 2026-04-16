import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize real Supabase auth
  useAuth();

  return <>{children}</>;
}
