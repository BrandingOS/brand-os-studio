import { 
  AuthService, 
  LoginCredentials, 
  RegisterData, 
  AuthResponse, 
  User 
} from '@/shared/types/services';
import { apiClient } from './apiClient';
import { storageService } from './storageService';

class AuthServiceImpl implements AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    if (response.success && response.data) {
      // Store auth data
      storageService.set('auth_token', response.data.token);
      storageService.set('refresh_token', response.data.refreshToken);
      storageService.set('user', response.data.user);
      
      return response.data;
    }
    
    throw new Error(response.error || 'Login failed');
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call success
      storageService.remove('auth_token');
      storageService.remove('refresh_token');
      storageService.remove('user');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);
    
    if (response.success && response.data) {
      // Store auth data
      storageService.set('auth_token', response.data.token);
      storageService.set('refresh_token', response.data.refreshToken);
      storageService.set('user', response.data.user);
      
      return response.data;
    }
    
    throw new Error(response.error || 'Registration failed');
  }

  async refreshToken(): Promise<AuthResponse> {
    const refreshToken = storageService.get<string>('refresh_token');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken
    });
    
    if (response.success && response.data) {
      // Update stored tokens
      storageService.set('auth_token', response.data.token);
      storageService.set('refresh_token', response.data.refreshToken);
      storageService.set('user', response.data.user);
      
      return response.data;
    }
    
    throw new Error(response.error || 'Token refresh failed');
  }

  async getCurrentUser(): Promise<User | null> {
    // Try to get user from local storage first
    const storedUser = storageService.get<User>('user');
    const token = storageService.get<string>('auth_token');
    
    if (!token) {
      return null;
    }

    if (storedUser) {
      // Validate token by fetching fresh user data
      const response = await apiClient.get<User>('/auth/me');
      
      if (response.success && response.data) {
        // Update stored user data
        storageService.set('user', response.data);
        return response.data;
      }
    }

    return null;
  }

  async resetPassword(email: string): Promise<void> {
    const response = await apiClient.post('/auth/reset-password', { email });
    
    if (!response.success) {
      throw new Error(response.error || 'Password reset failed');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Password change failed');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await apiClient.post('/auth/verify-email', { token });
    
    if (!response.success) {
      throw new Error(response.error || 'Email verification failed');
    }
  }

  async resendVerification(): Promise<void> {
    const response = await apiClient.post('/auth/resend-verification');
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to resend verification email');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = storageService.get<string>('auth_token');
    const user = storageService.get<User>('user');
    return !!(token && user);
  }

  // Get current auth token
  getToken(): string | null {
    return storageService.get<string>('auth_token');
  }

  // Check if token is expired (basic check)
  isTokenExpired(): boolean {
    const token = storageService.get<string>('auth_token');
    if (!token) return true;

    try {
      // Decode JWT payload (basic implementation)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() >= exp;
    } catch {
      return true;
    }
  }
}

export const authService = new AuthServiceImpl();
export { AuthServiceImpl };