import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize auth on app start
  useAuth();
  
  return <>{children}</>;
}