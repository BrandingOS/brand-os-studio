/**
 * Platform Module Registry
 *
 * Central registry of all BrandingOS feature modules.
 * Controls visibility, access, and navigation for the entire platform.
 */
import type { PlatformModule, PlanTier } from './types';

export const MODULES: PlatformModule[] = [
  // ─── Brand Creation ────────────────────────────────────────
  {
    id: 'onboarding',
    name: 'Brand Onboarding',
    description: 'Create your brand identity from scratch or import existing assets',
    category: 'brand-creation',
    icon: 'Sparkles',
    enabled: true,
    standalone: false,
    routePrefix: '/onboarding',
    requiredPlan: 'free',
    navOrder: 0,
    showInNav: false,
  },
  {
    id: 'logo-maker',
    name: 'Logo Maker',
    description: 'Design a professional logo with AI-powered suggestions',
    category: 'brand-creation',
    icon: 'PenTool',
    enabled: true,
    standalone: true,
    routePrefix: '/dashboard/logo-maker',
    requiredPlan: 'free',
    navOrder: 15,
    showInNav: true,
  },

  // ─── Brand Management ─────────────────��────────────────────
  {
    id: 'brand-hub',
    name: 'Brand Hub',
    description: 'Central overview of your brand identity and assets',
    category: 'brand-management',
    icon: 'Building2',
    enabled: true,
    standalone: false,
    routePrefix: '/dashboard/brand',
    requiredPlan: 'free',
    navOrder: 10,
    showInNav: true,
  },
  {
    id: 'brand-kit',
    name: 'Brand Kit',
    description: 'Colors, typography, logos, and brand assets in one place',
    category: 'brand-management',
    icon: 'Palette',
    enabled: true,
    standalone: false,
    routePrefix: '/dashboard/brand/:slug/brandkit',
    requiredPlan: 'free',
    navOrder: 20,
    showInNav: true,
  },
  {
    id: 'brand-guidelines',
    name: 'Brand Guidelines',
    description: 'Generate and customize professional brand guidelines',
    category: 'brand-management',
    icon: 'BookOpen',
    enabled: true,
    standalone: true,
    routePrefix: '/dashboard/brand/:slug/guidelines',
    requiredPlan: 'starter',
    navOrder: 25,
    showInNav: true,
  },
  {
    id: 'asset-manager',
    name: 'Asset Manager',
    description: 'Manage all brand files, logos, and media assets',
    category: 'brand-management',
    icon: 'FolderOpen',
    enabled: true,
    standalone: false,
    routePrefix: '/dashboard/brand/:slug/assets',
    requiredPlan: 'free',
    navOrder: 30,
    showInNav: true,
  },

  // ─── Design ────────��─────────────────────────────��─────────
  {
    id: 'design-editor',
    name: 'Design Editor',
    description: 'Canva-like editor for all brand collateral',
    category: 'design',
    icon: 'Layout',
    enabled: true,
    standalone: true,
    routePrefix: '/editor/design',
    requiredPlan: 'free',
    navOrder: 40,
    showInNav: true,
  },
  {
    id: 'social-media',
    name: 'Social Media Designer',
    description: 'Create social media posts, covers, and stories with brand assets',
    category: 'design',
    icon: 'Share2',
    enabled: true,
    standalone: true,
    routePrefix: '/dashboard/brand/:slug/social-media',
    requiredPlan: 'starter',
    navOrder: 45,
    showInNav: true,
  },
  {
    id: 'templates',
    name: 'Template Gallery',
    description: 'Browse and customize design templates',
    category: 'design',
    icon: 'LayoutGrid',
    enabled: true,
    standalone: true,
    routePrefix: '/dashboard/templates',
    requiredPlan: 'free',
    navOrder: 50,
    showInNav: true,
  },

  // ─── Export & Presentations ────────────────────────────────
  {
    id: 'logo-presentation',
    name: 'Logo Presentation',
    description: 'Present logo concepts with professional slide deck',
    category: 'export',
    icon: 'Presentation',
    enabled: true,
    standalone: true,
    routePrefix: '/dashboard/brand/:slug/logo-presentation',
    requiredPlan: 'starter',
    navOrder: 60,
    showInNav: true,
  },
  {
    id: 'logo-animation',
    name: 'Logo Animation',
    description: 'Animate your logo with professional motion presets',
    category: 'export',
    icon: 'Play',
    enabled: true,
    standalone: true,
    routePrefix: '/dashboard/brand/:slug/brandkit/animations',
    requiredPlan: 'pro',
    navOrder: 65,
    showInNav: true,
  },

  // ─── Utility Tools ─��──────────────────────────────────────
  {
    id: 'qr-code',
    name: 'QR Code Generator',
    description: 'Generate branded QR codes',
    category: 'utility',
    icon: 'QrCode',
    enabled: true,
    standalone: true,
    routePrefix: '/dashboard/brand/:slug/brandkit/qr-code',
    requiredPlan: 'free',
    navOrder: 70,
    showInNav: false,
  },
  {
    id: 'color-tools',
    name: 'Color Tools',
    description: 'Color palette generator, contrast checker, harmonies',
    category: 'utility',
    icon: 'Pipette',
    enabled: true,
    standalone: true,
    routePrefix: '/tools/colors',
    requiredPlan: 'free',
    navOrder: 75,
    showInNav: false,
  },

  // ─── Settings ───────────────────────────────────────��──────
  {
    id: 'settings',
    name: 'Settings',
    description: 'Account, billing, team, and integrations',
    category: 'settings',
    icon: 'Settings',
    enabled: true,
    standalone: false,
    routePrefix: '/settings',
    requiredPlan: 'free',
    navOrder: 100,
    showInNav: true,
  },
];

// ─── Helper Functions ─────────────��──────────────────────────────────

export function getModule(id: string): PlatformModule | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getModulesByCategory(category: PlatformModule['category']): PlatformModule[] {
  return MODULES.filter((m) => m.category === category && m.enabled);
}

export function getNavModules(): PlatformModule[] {
  return MODULES.filter((m) => m.showInNav && m.enabled).sort((a, b) => a.navOrder - b.navOrder);
}

export function getStandaloneModules(): PlatformModule[] {
  return MODULES.filter((m) => m.standalone && m.enabled);
}

export function isModuleAccessible(moduleId: string, userPlan: PlanTier): boolean {
  const module = getModule(moduleId);
  if (!module || !module.enabled) return false;
  const tierOrder: PlanTier[] = ['free', 'starter', 'pro', 'enterprise'];
  return tierOrder.indexOf(userPlan) >= tierOrder.indexOf(module.requiredPlan);
}
