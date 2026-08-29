// ============================================================================
// The capability catalog — the SAME matrix migration 038 seeds into
// `public.role_capabilities`, in the one shape the UI can read.
//
// This file is a MIRROR, not a second opinion. The database is the security boundary;
// these tables exist so the interface can hide what it must not offer, and
// `catalog.test.ts` parses the migration and fails if the two ever disagree.
//
// docs/access-architecture/03-authorization-model.md is the specification.
// ============================================================================

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';
export type BrandRole = 'manager' | 'editor' | 'designer' | 'viewer';
export type BrandAccessMode = 'all' | 'selected';
export type MemberStatus = 'active' | 'suspended';

export const WORKSPACE_ROLES: readonly WorkspaceRole[] = ['owner', 'admin', 'member', 'guest'];
export const BRAND_ROLES: readonly BrandRole[] = ['manager', 'editor', 'designer', 'viewer'];

/**
 * RESERVED capabilities name a resource that is still per-device (ADR-008): guideline
 * documents, comments and approvals live in localStorage/IndexedDB. The id exists so the
 * UI and the future policy share a name, but it resolves to false for everyone and is
 * never offered in an access surface — nothing may be "granted" that the server cannot
 * enforce.
 */
export const RESERVED_CAPABILITIES = [
  'brand.guideline.edit',
  'brand.guideline.export',
  'comments.create',
  'approvals.review',
  'workspace.credits.manage',
] as const;

export const WORKSPACE_ROLE_CAPABILITIES: Record<WorkspaceRole, readonly string[]> = {
  owner: ["workspace.view",
    "workspace.settings.view",
    "workspace.settings.edit",
    "workspace.delete",
    "workspace.transfer_ownership",
    "workspace.billing.view",
    "workspace.billing.manage",
    "workspace.usage.view",
    "members.view",
    "members.invite",
    "members.manage",
    "members.remove",
    "brands.list",
    "brands.create",
    "brands.delete",
    "audit.view",
    "activity.view"],
  admin: ["workspace.view",
    "workspace.settings.view",
    "workspace.settings.edit",
    "workspace.billing.view",
    "workspace.billing.manage",
    "workspace.usage.view",
    "members.view",
    "members.invite",
    "members.manage",
    "members.remove",
    "brands.list",
    "brands.create",
    "brands.delete",
    "audit.view",
    "activity.view"],
  member: ["workspace.view",
    "workspace.settings.view",
    "members.view",
    "brands.list",
    "activity.view"],
  guest: ["workspace.view",
    "brands.list"],
};

export const BRAND_ROLE_CAPABILITIES: Record<BrandRole, readonly string[]> = {
  manager: ["brand.view",
    "brand.settings.view",
    "brand.settings.edit",
    "brand.card.edit",
    "brand.archive",
    "brand.access.view",
    "brand.access.manage",
    "brand.setup.edit",
    "brand.strategy.edit",
    "brand.kit.generate",
    "brand.kit.approve",
    "brand.kit.export",
    "designs.create",
    "designs.edit",
    "designs.delete",
    "designs.export",
    "templates.save",
    "templates.submit_community",
    "library.upload",
    "library.edit",
    "library.delete",
    "ai.generate",
    "share.view",
    "share.link",
    "share.publish_public",
    "activity.view"],
  editor: ["brand.view",
    "brand.settings.view",
    "brand.card.edit",
    "brand.access.view",
    "brand.setup.edit",
    "brand.strategy.edit",
    "brand.kit.generate",
    "brand.kit.approve",
    "brand.kit.export",
    "designs.create",
    "designs.edit",
    "designs.delete",
    "designs.export",
    "templates.save",
    "library.upload",
    "library.edit",
    "library.delete",
    "ai.generate",
    "share.view",
    "share.link",
    "activity.view"],
  designer: ["brand.view",
    "brand.kit.generate",
    "brand.kit.export",
    "designs.create",
    "designs.edit",
    "designs.export",
    "templates.save",
    "library.upload",
    "library.edit",
    "ai.generate",
    "activity.view"],
  viewer: ["brand.view"],
};

/**
 * What a per-member or per-brand override may touch. Everything else is role-bound: you
 * change the role, not the override (ADR-003). The last three workspace entries are BRAND
 * capabilities held at workspace scope, because a member whose mode is `all` has no
 * brand_access row to hang the named switches on.
 */
export function overridableCapabilities(scope: 'workspace' | 'brand', role: string): readonly string[] {
  if (scope === 'workspace') {
    if (role === 'member' || role === 'guest') {
      return [
        'brands.create', 'workspace.usage.view', 'workspace.billing.view',
        'workspace.billing.manage', 'members.view', 'activity.view',
        'designs.export', 'brand.kit.export', 'ai.generate',
      ];
    }
    return [];
  }
  return [
    'brand.settings.view', 'brand.card.edit', 'brand.access.view', 'brand.setup.edit',
    'brand.strategy.edit', 'brand.kit.generate', 'brand.kit.approve', 'brand.kit.export',
    'designs.create', 'designs.edit', 'designs.delete', 'designs.export', 'templates.save',
    'library.upload', 'library.edit', 'library.delete', 'ai.generate', 'share.view',
    'share.link', 'activity.view',
  ];
}

/** The three switches every plan gets (03 §2.3), and what each one stores. */
export const NAMED_SWITCHES = [
  {
    id: 'export',
    label: 'Can download and export',
    scope: 'brand',
    capabilities: ['designs.export', 'brand.kit.export'],
    defaultFor: (role: BrandRole) => role !== 'viewer',
  },
  {
    id: 'ai',
    label: 'Can use AI generation',
    scope: 'brand',
    capabilities: ['ai.generate'],
    // off for guests entirely, and for viewers; the server applies the guest rule too
    defaultFor: (role: BrandRole) => role !== 'viewer',
  },
  {
    id: 'billing',
    label: 'Can see billing',
    scope: 'workspace',
    capabilities: ['workspace.billing.view'],
    defaultFor: () => false,
  },
] as const;

/** Human labels for the roles, for every surface that names one. */
export const WORKSPACE_ROLE_LABEL: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  guest: 'Guest',
};
export const BRAND_ROLE_LABEL: Record<BrandRole, string> = {
  manager: 'Manager',
  editor: 'Editor',
  designer: 'Designer',
  viewer: 'Viewer',
};

export const WORKSPACE_ROLE_DESCRIPTION: Record<WorkspaceRole, string> = {
  owner: 'Everything, including billing, ownership and deleting the workspace.',
  admin: 'Manages people, brands and billing. Can do anything in every brand.',
  member: 'Works in the brands they are given. Cannot manage people or billing.',
  guest: 'An outside collaborator. Sees only the brands they are given, and nothing else.',
};
export const BRAND_ROLE_DESCRIPTION: Record<BrandRole, string> = {
  manager: 'Runs the brand: settings, sharing, who has access, archiving.',
  editor: 'Edits everything in the brand — setup, strategy, kit, designs, library.',
  designer: 'Makes designs, uploads to the library and generates with AI. Cannot change the brand itself.',
  viewer: 'Reads the brand. No edits, and no downloads unless you switch them on.',
};

export function isReserved(capability: string): boolean {
  return (RESERVED_CAPABILITIES as readonly string[]).includes(capability);
}
