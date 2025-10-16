import { useEffect } from 'react';
import { useSessionStore } from '@/shared/store/sessionStore';
import type { User } from '@/shared/types/user';

// Development flag - set to false to disable auto-login
const DEV_AUTO_LOGIN = true;

// Mock default user for development
const createMockUser = (): User => ({
  id: '12345678-1234-1234-1234-123456789012', // Fixed UUID for consistency
  email: 'hamza2007ezzat@gmail.com',
  name: 'Hamza Ezzat',
  avatar: undefined,
  plan: 'pro', // Pro plan to access all features
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date()
});

export const useAutoLogin = () => {
  const { signIn, isAuthenticated } = useSessionStore();

  useEffect(() => {
    // Only auto-login in development and if not already authenticated
    if (DEV_AUTO_LOGIN && !isAuthenticated) {
      const mockUser = createMockUser();
      signIn(mockUser);
      console.log('🔓 DEV MODE: Auto-logged in as', mockUser.email);
    }
  }, [signIn, isAuthenticated]);

  return {
    isDevelopmentMode: DEV_AUTO_LOGIN,
    isAutoLogin: DEV_AUTO_LOGIN && isAuthenticated
  };
};