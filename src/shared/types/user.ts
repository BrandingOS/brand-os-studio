export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: 'admin' | 'user';
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user?: User;
  mode: 'guest' | 'user';
  isAuthenticated: boolean;
  isLoading: boolean;
}