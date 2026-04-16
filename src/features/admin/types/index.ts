import type { PlatformRole } from '@/shared/types/user';
import { isPlatformRoleAtLeast } from '@/shared/types/user';
import type { PlanKey } from '@/shared/utils/plan-gates';

// ─── Admin Actions & Permissions ────────────────────────────────────────────

export type AdminAction =
  | 'view_users' | 'edit_users' | 'delete_users' | 'manage_roles' | 'manage_plans'
  | 'suspend_users' | 'impersonate'
  | 'view_brands' | 'edit_brands' | 'delete_brands'
  | 'view_workspaces' | 'delete_workspaces'
  | 'manage_subscriptions' | 'manage_early_access'
  | 'view_activity' | 'manage_feature_flags'
  | 'manage_announcements' | 'manage_settings'
  | 'view_reports' | 'purge_data';

/** Minimum role required for each admin action */
const ACTION_MIN_ROLE: Record<AdminAction, PlatformRole> = {
  view_users: 'moderator',
  edit_users: 'admin',
  delete_users: 'admin',
  manage_roles: 'super_admin',
  manage_plans: 'admin',
  suspend_users: 'admin',
  impersonate: 'super_admin',
  view_brands: 'moderator',
  edit_brands: 'admin',
  delete_brands: 'admin',
  view_workspaces: 'moderator',
  delete_workspaces: 'admin',
  manage_subscriptions: 'admin',
  manage_early_access: 'moderator',
  view_activity: 'moderator',
  manage_feature_flags: 'super_admin',
  manage_announcements: 'admin',
  manage_settings: 'super_admin',
  view_reports: 'admin',
  purge_data: 'super_admin',
};

/** Check if a platform role can perform a given admin action */
export function canPerformAction(role: PlatformRole, action: AdminAction): boolean {
  const minRole = ACTION_MIN_ROLE[action];
  return isPlatformRoleAtLeast(role, minRole);
}

// ─── Announcement Types ─────────────────────────────────────────────────────

export type AnnouncementType = 'info' | 'warning' | 'maintenance' | 'release';
export type AnnouncementAudience = 'all' | 'free' | 'pro' | 'agency' | 'admins';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  isActive: boolean;
  startsAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementFormData {
  title: string;
  body: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  isActive: boolean;
  startsAt: string;
  expiresAt: string;
}

// ─── Platform Config Types ──────────────────────────────────────────────────

export interface PlatformConfig {
  key: string;
  value: any;
  updatedBy?: string;
  updatedAt: string;
}

// ─── Feature Flag Types ─────────────────────────────────────────────────────

export interface FeatureFlagDefinition {
  key: string;
  label: string;
  description: string;
  category: 'limits' | 'export' | 'collaboration' | 'tools' | 'advanced';
  valueType: 'boolean' | 'number';
}

export const FEATURE_FLAG_DEFINITIONS: FeatureFlagDefinition[] = [
  // Limits
  { key: 'maxBrands', label: 'Max Brands', description: 'Maximum number of brands', category: 'limits', valueType: 'number' },
  { key: 'maxMembers', label: 'Max Members', description: 'Maximum workspace members', category: 'limits', valueType: 'number' },
  { key: 'maxStorage', label: 'Max Storage (MB)', description: 'Maximum storage in megabytes', category: 'limits', valueType: 'number' },
  // Export
  { key: 'canExportZip', label: 'ZIP Export', description: 'Export brand assets as ZIP', category: 'export', valueType: 'boolean' },
  { key: 'canExportPdf', label: 'PDF Export', description: 'Export brand guidelines as PDF', category: 'export', valueType: 'boolean' },
  // Collaboration
  { key: 'canCollaborate', label: 'Team Collaboration', description: 'Invite team members', category: 'collaboration', valueType: 'boolean' },
  { key: 'canApprovals', label: 'Approval Workflow', description: 'Review and approve assets', category: 'collaboration', valueType: 'boolean' },
  // Tools
  { key: 'canShowcase', label: 'Brand Showcase', description: 'Public brand portfolio page', category: 'tools', valueType: 'boolean' },
  { key: 'canBrandGuidelines', label: 'Brand Guidelines', description: 'Slide-based guidelines editor', category: 'tools', valueType: 'boolean' },
  { key: 'canTemplates', label: 'Templates', description: 'Access template library', category: 'tools', valueType: 'boolean' },
  { key: 'canAiDesign', label: 'AI Design', description: 'AI-powered design tools', category: 'tools', valueType: 'boolean' },
  { key: 'canBentoGrid', label: 'Bento Grid', description: 'Bento grid layouts', category: 'tools', valueType: 'boolean' },
  { key: 'canAnalytics', label: 'Analytics', description: 'Brand analytics dashboard', category: 'tools', valueType: 'boolean' },
  // Advanced
  { key: 'canCustomDomain', label: 'Custom Domain', description: 'Custom domain for showcase', category: 'advanced', valueType: 'boolean' },
  { key: 'canPriority', label: 'Priority Support', description: 'Priority customer support', category: 'advanced', valueType: 'boolean' },
];

// ─── Report Types ───────────────────────────────────────────────────────────

export interface PlatformMetrics {
  totalUsers: number;
  totalBrands: number;
  totalWorkspaces: number;
  mrr: number;
  conversionRate: number;
  avgBrandsPerUser: number;
  planDistribution: { plan: string; count: number }[];
}

export interface GrowthDataPoint {
  date: string;
  users: number;
  brands: number;
  workspaces: number;
}
