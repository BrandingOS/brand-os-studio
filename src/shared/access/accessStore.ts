// ============================================================================
// What this browser knows about what its user may do.
//
// Two rules the rest of the app depends on:
//
//  1. NEVER PERSISTED. A removed member must not keep a cached yes. This store starts
//     empty on every load and is filled from `my_access()`.
//  2. ACCESS IS TRI-STATE — unknown | allowed | denied. Between the first paint and the
//     RPC returning, the honest answer is "we don't know yet", not "no". Rendering the
//     denied branch during hydration is how a Member sees Setup flash a read-only banner
//     on every single load (AX-09).
// ============================================================================
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

/**
 * `src/integrations/supabase/types.ts` is generated and currently ~14 tables behind the
 * schema (it stops at the 006 era), so the access RPCs are not in its union. The house
 * pattern for this is an untyped accessor at the boundary — see
 * `features/image-generation/credits.ts` — with the shape asserted right after. Regenerating
 * the types is worth doing on its own, not as a side effect of this change.
 */
const rpc = (name: string, args?: Record<string, unknown>) =>
  (supabase as unknown as {
    rpc: (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  }).rpc(name, args);
import { effectiveCapabilities, type BrandRef, type Membership } from './resolve';
import type { BrandRole, WorkspaceRole } from './catalog';

export type WorkspaceAccess = {
  id: string;
  name: string;
  slug: string;
  isPersonal: boolean;
  role: WorkspaceRole;
  mode: 'all' | 'selected';
  defaultBrandRole: BrandRole | null;
  overrides: { grant?: string[]; deny?: string[] };
  creditsMonthlyCap: number | null;
  capabilities: string[];
};

export type BrandAccessEntry = {
  id: string;
  slug: string;
  archived: boolean;
  role?: BrandRole;
  overrides?: { grant?: string[]; deny?: string[] };
  capabilities: string[];
};

export type AccessPhase = 'unknown' | 'ready' | 'guest';

type AccessState = {
  phase: AccessPhase;
  workspaces: WorkspaceAccess[];
  currentWorkspaceId: string | null;
  /** Brand access for the CURRENT workspace only: an agency's brand list is unbounded. */
  brands: Record<string, BrandAccessEntry>;
  brandsLoadedFor: string | null;
  /** Bumped on every switch; a response from an older generation is dropped. */
  generation: number;

  hydrate: () => Promise<void>;
  loadBrands: (workspaceId: string) => Promise<void>;
  setCurrentWorkspace: (id: string) => Promise<void>;
  reset: () => void;

  current: () => WorkspaceAccess | null;
  membership: () => Membership | null;
  brandRef: (brandId: string) => BrandRef | null;
};

export const useAccessStore = create<AccessState>((set, get) => ({
  phase: 'unknown',
  workspaces: [],
  currentWorkspaceId: null,
  brands: {},
  brandsLoadedFor: null,
  generation: 0,

  hydrate: async () => {
    const { data, error } = (await rpc('my_access')) as {
      data: { workspaces?: WorkspaceAccess[] } | null; error: unknown;
    };
    if (error || !data) {
      // A visitor with no session is a guest, not an unknown: the UI may settle.
      set({ phase: 'guest', workspaces: [], currentWorkspaceId: null, brands: {}, brandsLoadedFor: null });
      return;
    }
    const workspaces = (data.workspaces ?? []) as WorkspaceAccess[];
    if (workspaces.length === 0) {
      set({ phase: 'guest', workspaces: [], currentWorkspaceId: null });
      return;
    }
    // Keep the workspace we were in if it is still ours; otherwise the personal one.
    const previous = get().currentWorkspaceId;
    const keep = previous && workspaces.some((w) => w.id === previous) ? previous : null;
    const fallback = workspaces.find((w) => w.isPersonal)?.id ?? workspaces[0].id;
    const currentWorkspaceId = keep ?? fallback;
    set({ phase: 'ready', workspaces, currentWorkspaceId, generation: get().generation + 1 });
    await get().loadBrands(currentWorkspaceId);
  },

  loadBrands: async (workspaceId: string) => {
    // Two overlapping switches, or a switch racing hydrate()'s own load, would otherwise
    // let a stale response win and leave `brands` describing a workspace we already left.
    // Same guard brandStore uses for exactly this. (Pass C, F3.)
    const generation = get().generation;
    const { data, error } = (await rpc('my_brand_access', { _workspace_id: workspaceId })) as {
      data: { brands?: BrandAccessEntry[] } | null; error: unknown;
    };
    if (get().generation !== generation || get().currentWorkspaceId !== workspaceId) return;

    if (error || !data) {
      set({ brands: {}, brandsLoadedFor: workspaceId });
      return;
    }
    const brands: Record<string, BrandAccessEntry> = {};
    for (const b of (data.brands ?? []) as BrandAccessEntry[]) brands[b.id] = b;
    set({ brands, brandsLoadedFor: workspaceId });
  },

  setCurrentWorkspace: async (id: string) => {
    if (!get().workspaces.some((w) => w.id === id)) return;
    // Clear the brand map FIRST: showing the previous workspace's answers for a moment is
    // how a switcher leaks one tenant's shape into another's screen.
    set({
      currentWorkspaceId: id, brands: {}, brandsLoadedFor: null,
      generation: get().generation + 1,
    });
    await get().loadBrands(id);
  },

  reset: () => set({
    phase: 'unknown', workspaces: [], currentWorkspaceId: null, brands: {},
    brandsLoadedFor: null, generation: get().generation + 1,
  }),

  current: () => {
    const { workspaces, currentWorkspaceId } = get();
    return workspaces.find((w) => w.id === currentWorkspaceId) ?? null;
  },

  /** The current membership in the shape the shared resolver reads. */
  membership: () => {
    const w = get().current();
    if (!w) return null;
    const brands = get().brands;
    return {
      workspaceId: w.id,
      role: w.role,
      status: 'active',
      brandAccessMode: w.mode,
      defaultBrandRole: w.defaultBrandRole,
      overrides: w.overrides ?? {},
      grants: Object.values(brands)
        .filter((b) => b.role)
        .map((b) => ({ brandId: b.id, role: b.role as BrandRole, overrides: b.overrides })),
    };
  },

  brandRef: (brandId: string) => {
    const w = get().current();
    const b = get().brands[brandId];
    if (!w || !b) return null;
    return { id: b.id, workspaceId: w.id, archived: b.archived };
  },
}));

/**
 * The answer for one capability, with `unknown` kept distinct from `false`.
 *
 * The server's own list is preferred when we have it (it is the same resolver the policies
 * use); the local resolver answers for a brand whose entry has not arrived yet.
 */
export function resolveCapability(
  state: Pick<AccessState, 'phase' | 'brands' | 'brandsLoadedFor' | 'currentWorkspaceId'> & {
    current: () => WorkspaceAccess | null;
    membership: () => Membership | null;
    brandRef: (id: string) => BrandRef | null;
  },
  capability: string,
  brandId?: string | null,
): 'unknown' | boolean {
  if (state.phase === 'unknown') return 'unknown';
  const w = state.current();
  if (!w) return false;

  if (!brandId) return w.capabilities.includes(capability);

  if (state.brandsLoadedFor !== state.currentWorkspaceId) return 'unknown';
  const entry = state.brands[brandId];
  if (entry) return entry.capabilities.includes(capability);

  // The brand is not in the map: either it is not ours, or it belongs to another
  // workspace. Both mean no capability here.
  const ref = state.brandRef(brandId);
  if (!ref) return false;
  return effectiveCapabilities(state.membership(), ref).has(capability);
}
