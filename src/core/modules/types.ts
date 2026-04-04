/**
 * Platform Module System — Type Definitions
 *
 * Each feature in BrandOS is a module that can be:
 * - Enabled/disabled per plan
 * - Hidden from navigation
 * - Extracted as a standalone tool
 * - Sold separately
 */

export interface PlatformModule {
  /** Unique module identifier */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Module category for grouping */
  category: ModuleCategory;
  /** Icon name (lucide) */
  icon: string;
  /** Whether the module is currently enabled */
  enabled: boolean;
  /** Whether this module can work as a standalone tool */
  standalone: boolean;
  /** Route prefix for this module's pages */
  routePrefix: string;
  /** Required plan tier to access */
  requiredPlan: PlanTier;
  /** Feature flags this module depends on */
  featureFlags?: string[];
  /** Order in navigation */
  navOrder: number;
  /** Whether to show in main navigation */
  showInNav: boolean;
}

export type ModuleCategory =
  | 'brand-creation'    // Onboarding, logo maker
  | 'brand-management'  // Brand kit, guidelines, assets
  | 'design'            // Editor, templates, social media
  | 'export'            // Logo animation, presentations, export tools
  | 'utility'           // Image tools, background remover, etc.
  | 'settings';         // Account, billing, team

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export interface ModuleRoute {
  moduleId: string;
  path: string;
  component: string;
  layout: 'dashboard' | 'editor' | 'canvas' | 'full' | 'onboarding';
}
