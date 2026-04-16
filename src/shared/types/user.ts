// ─── Platform Role Hierarchy ────────────────────────────────────────────────
export type PlatformRole = 'super_admin' | 'admin' | 'moderator' | 'user';
export type AccountStatus = 'active' | 'suspended' | 'banned';

const ROLE_RANK: Record<PlatformRole, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  user: 1,
};

/** Returns true if `role` is at least `required` in the hierarchy. */
export function isPlatformRoleAtLeast(role: PlatformRole, required: PlatformRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

export function platformRoleLabel(role: PlatformRole): string {
  const labels: Record<PlatformRole, string> = {
    super_admin: 'Super Admin',
    admin: 'Admin',
    moderator: 'Moderator',
    user: 'User',
  };
  return labels[role] || 'User';
}

export function platformRoleBadgeVariant(role: PlatformRole): string {
  const variants: Record<PlatformRole, string> = {
    super_admin: 'destructive',
    admin: 'default',
    moderator: 'secondary',
    user: 'outline',
  };
  return variants[role] || 'outline';
}

export function accountStatusBadgeVariant(status: AccountStatus): string {
  const variants: Record<AccountStatus, string> = {
    active: 'default',
    suspended: 'secondary',
    banned: 'destructive',
  };
  return variants[status] || 'outline';
}

// ─── Core Types ─────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role?: PlatformRole;
  plan: 'free' | 'pro' | 'agency';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user?: User;
  mode: 'guest' | 'user';
  isAuthenticated: boolean;
  isLoading: boolean;
}