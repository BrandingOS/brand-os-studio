// The public surface of the access layer. Import from here, not from the files.
export {
  WORKSPACE_ROLES, BRAND_ROLES,
  WORKSPACE_ROLE_CAPABILITIES, BRAND_ROLE_CAPABILITIES, RESERVED_CAPABILITIES,
  WORKSPACE_ROLE_LABEL, BRAND_ROLE_LABEL,
  WORKSPACE_ROLE_DESCRIPTION, BRAND_ROLE_DESCRIPTION,
  NAMED_SWITCHES, overridableCapabilities, isReserved,
  type WorkspaceRole, type BrandRole, type BrandAccessMode, type MemberStatus,
} from './catalog';
export {
  effectiveCapabilities, can, brandRoleFor,
  type Membership, type BrandRef, type BrandGrant, type CapabilityOverrides,
} from './resolve';
export {
  reasonMessage, isUpgradeable, parseDenial,
  type AccessDenialReason, type DenialDetail,
} from './reasons';
export {
  useAccessStore, resolveCapability,
  type WorkspaceAccess, type BrandAccessEntry, type AccessPhase,
} from './accessStore';
export {
  useCan, useCanShow, useIsDenied, useAccessUnknown,
  useCurrentWorkspace, useWorkspaces, useBrandAccess, useEnsureAccess,
  type Tri,
} from './useAccess';
export { Can, AccessGate, ReadOnlyNotice, AccessDeniedPanel } from './Can';
