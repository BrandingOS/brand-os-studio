// Core authentication hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/shared/stores/authStore';
import { authService } from '@/shared/services/authService';
import { LoginCredentials, RegisterData } from '@/shared/types/services';

export const useAuth = () => {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, login, logout, setLoading } = useAuthStore();

  // Query for current user
  const { isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: authService.getCurrentUser,
    enabled: !user && authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update user when query succeeds
  const updateUser = (userData: any) => {
    if (userData) {
      useAuthStore.getState().setUser(userData);
    } else {
      logout();
    }
  };

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authService.login(credentials),
    onSuccess: (response) => {
      login(response.user, response.token);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      console.error('Login failed:', error);
    }
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (userData: RegisterData) => authService.register(userData),
    onSuccess: (response) => {
      login(response.user, response.token);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      console.error('Registration failed:', error);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      logout();
      queryClient.clear();
    }
  });

  return {
    // State
    user,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    
    // Actions
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    
    // Mutation states
    loginError: loginMutation.error,
    registerError: registerMutation.error,
    isLoginPending: loginMutation.isPending,
    isRegisterPending: registerMutation.isPending,
  };
};