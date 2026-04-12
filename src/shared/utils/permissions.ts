/**
 * Permission system — pure functions for role-based access control.
 *
 * Maps workspace_role enum to allowed actions. The role hierarchy is:
 *   owner > admin > editor > exporter > viewer
 */
import type { WorkspaceRole } from '@/core/types/services';

export type PermissionAction =
  | 'edit_brand'
  | 'delete_brand'
  | 'upload_asset'
  | 'delete_asset'
  | 'export'
  | 'manage_members'
  | 'approve'
  | 'manage_billing'
  | 'comment'
  | 'view';

/**
 * Minimum role required for each action.
 */
const ACTION_MIN_ROLE: Record<PermissionAction, WorkspaceRole> = {
  view: 'viewer',
  comment: 'viewer',
  export: 'exporter',
  edit_brand: 'editor',
  upload_asset: 'editor',
  approve: 'editor',
  delete_asset: 'admin',
  delete_brand: 'admin',
  manage_members: 'admin',
  manage_billing: 'owner',
};

/**
 * Role hierarchy — lower index = higher privilege.
 */
const ROLE_ORDER: WorkspaceRole[] = ['owner', 'admin', 'editor', 'exporter', 'viewer'];

function roleIndex(role: WorkspaceRole): number {
  return ROLE_ORDER.indexOf(role);
}

/**
 * Check if a role can perform an action.
 */
export function canRoleDo(role: WorkspaceRole, action: PermissionAction): boolean {
  const minRole = ACTION_MIN_ROLE[action];
  return roleIndex(role) <= roleIndex(minRole);
}

/**
 * Get all actions a role can perform.
 */
export function getAllowedActions(role: WorkspaceRole): PermissionAction[] {
  return Object.entries(ACTION_MIN_ROLE)
    .filter(([, minRole]) => roleIndex(role) <= roleIndex(minRole))
    .map(([action]) => action as PermissionAction);
}

/**
 * Check if roleA is higher or equal to roleB in the hierarchy.
 */
export function isRoleAtLeast(roleA: WorkspaceRole, roleB: WorkspaceRole): boolean {
  return roleIndex(roleA) <= roleIndex(roleB);
}
