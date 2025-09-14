import { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DevModeIndicator } from './DevModeIndicator';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize auth on app start
  useAuth();
  
  return (
    <>
      {children}
      <DevModeIndicator />
    </>
  );
}