// ============================================================================
// The capability resolver, in TypeScript.
//
// This is the SAME algorithm as `public.effective_capabilities` (migration 038), written
// against plain data so the UI can answer without a round trip. It is not the security
// boundary — RLS is — but if the two disagree the interface lies to people, so both are
// tested against one shared truth table (`supabase/tests/fixtures/access-cases.json`).
//
// docs/access-architecture/03-authorization-model.md §3 is the specification, and the
// numbered steps below are its numbered steps.
// ============================================================================
import {
  BRAND_ROLE_CAPABILITIES,
  RESERVED_CAPABILITIES,
  WORKSPACE_ROLE_CAPABILITIES,
  type BrandAccessMode,
  type BrandRole,
  type MemberStatus,
  type WorkspaceRole,
} from './catalog';

export type CapabilityOverrides = { grant?: string[]; deny?: string[] };

export type BrandGrant = {
  brandId: string;
  role: BrandRole;
  overrides?: CapabilityOverrides;
};

export type Membership = {
  workspaceId: string;
  role: WorkspaceRole;
  status: MemberStatus;
  brandAccessMode: BrandAccessMode;
  defaultBrandRole?: BrandRole | null;
  overrides?: CapabilityOverrides;
  /** Only the grants for this workspace; `all`-mode members may still have per-brand ones. */
  grants?: BrandGrant[];
};

export type BrandRef = {
  id: string;
  workspaceId: string;
  archived?: boolean;
};

/** Which brand role applies, or null when the brand is not visible to this member at all. */
export function brandRoleFor(m: Membership, brand: BrandRef): BrandRole | null {
  if (m.role === 'owner' || m.role === 'admin') return 'manager';
  const grant = m.grants?.find((g) => g.brandId === brand.id);
  if (grant) return grant.role;
  if (m.brandAccessMode === 'all') return m.defaultBrandRole ?? null;
  return null;
}

export function effectiveCapabilities(
  m: Membership | null | undefined,
  brand?: BrandRef | null,
): Set<string> {
  // 2. an active membership, or nothing at all
  if (!m || m.status !== 'active') return new Set();

  // 3. workspace preset ⊕ overrides
  const caps = new Set<string>(WORKSPACE_ROLE_CAPABILITIES[m.role] ?? []);
  for (const g of m.overrides?.grant ?? []) caps.add(g);
  for (const d of m.overrides?.deny ?? []) caps.delete(d);

  // 4. workspace scope only
  if (!brand) return strip(caps);

  // 5. a brand in another workspace does not exist for this context
  if (brand.workspaceId !== m.workspaceId) return new Set();

  // 7. which brand role, if any
  const role = brandRoleFor(m, brand);
  if (!role) return strip(caps);

  // 6. an archived brand is read-only for EVERYONE; managers keep the key to restore it
  if (brand.archived) {
    caps.add('brand.view');
    if (m.role === 'owner' || m.role === 'admin' || role === 'manager') caps.add('brand.archive');
    return strip(caps);
  }

  // 8. brand preset ⊕ per-brand grants
  const grant = m.grants?.find((g) => g.brandId === brand.id);
  for (const c of BRAND_ROLE_CAPABILITIES[role] ?? []) caps.add(c);
  for (const g of grant?.overrides?.grant ?? []) caps.add(g);

  // a guest never publishes a client's work to a public catalogue, whatever their role
  if (m.role === 'guest') caps.delete('templates.submit_community');

  // A per-brand DENY is applied last, over the union: "…except on Client B" must beat a
  // workspace-wide grant, or turning AI off for one brand would be silently undone.
  for (const d of grant?.overrides?.deny ?? []) caps.delete(d);

  return strip(caps);
}

export function can(
  m: Membership | null | undefined,
  capability: string,
  brand?: BrandRef | null,
): boolean {
  return effectiveCapabilities(m, brand).has(capability);
}

function strip(caps: Set<string>): Set<string> {
  for (const r of RESERVED_CAPABILITIES) caps.delete(r);
  return caps;
}
