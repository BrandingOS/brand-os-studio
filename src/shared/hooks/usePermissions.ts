/**
 * Hook for checking permissions in the current brand/workspace context.
 *
 * Returns booleans for common actions so UI components can easily
 * show/hide/disable controls.
 */
import { useMemo } from 'react';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { canRoleDo, type PermissionAction } from '@/shared/utils/permissions';
import type { WorkspaceRole } from '@/core/types/services';

interface Permissions {
  role: WorkspaceRole;
  canView: boolean;
  canComment: boolean;
  canExport: boolean;
  canEdit: boolean;
  canUploadAsset: boolean;
  canApprove: boolean;
  canDeleteAsset: boolean;
  canDeleteBrand: boolean;
  canManageTeam: boolean;
  canManageBilling: boolean;
  can: (action: PermissionAction) => boolean;
}

/**
 * Default permissions for guest/unauthenticated users.
 */
const GUEST_PERMISSIONS: Permissions = {
  role: 'viewer',
  canView: true,
  canComment: false,
  canExport: false,
  canEdit: true, // Guest can edit locally
  canUploadAsset: true, // Guest can upload locally
  canApprove: false,
  canDeleteAsset: true, // Guest can delete locally
  canDeleteBrand: true, // Guest can delete locally
  canManageTeam: false,
  canManageBilling: false,
  can: () => true, // Guest mode has no server restrictions
};

export function usePermissions(): Permissions {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const user = useSessionStore((s) => s.user);
  const members = useWorkspaceStore((s) => s.members);
  const currentWorkspace = useWorkspaceStore((s) => s.current);

  return useMemo(() => {
    if (!isAuthenticated || !user?.id || !currentWorkspace) {
      return GUEST_PERMISSIONS;
    }

    // Find user's role in the current workspace
    const membership = members.find((m) => m.userId === user.id);
    const role: WorkspaceRole = membership?.role || 'viewer';

    return {
      role,
      canView: canRoleDo(role, 'view'),
      canComment: canRoleDo(role, 'comment'),
      canExport: canRoleDo(role, 'export'),
      canEdit: canRoleDo(role, 'edit_brand'),
      canUploadAsset: canRoleDo(role, 'upload_asset'),
      canApprove: canRoleDo(role, 'approve'),
      canDeleteAsset: canRoleDo(role, 'delete_asset'),
      canDeleteBrand: canRoleDo(role, 'delete_brand'),
      canManageTeam: canRoleDo(role, 'manage_members'),
      canManageBilling: canRoleDo(role, 'manage_billing'),
      can: (action: PermissionAction) => canRoleDo(role, action),
    };
  }, [isAuthenticated, user?.id, currentWorkspace, members]);
}
