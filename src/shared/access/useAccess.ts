// ============================================================================
// The hooks every surface uses to ask "may I?".
//
// `useCan` returns a TRI-STATE (`unknown | true | false`) and `useCanShow`/`useIsDenied`
// are the two readings of it, so a component never accidentally treats "not loaded yet"
// as "no" (AX-09). Render a skeleton while unknown; show the denied branch only on false.
// ============================================================================
import { useCallback, useEffect } from 'react';
import { useAccessStore, resolveCapability, type WorkspaceAccess } from './accessStore';
import { effectiveCapabilities } from './resolve';

export type Tri = 'unknown' | boolean;

/** May the current user do this, here? `unknown` until access has hydrated. */
export function useCan(capability: string, brandId?: string | null): Tri {
  return useAccessStore((s) => resolveCapability(s as never, capability, brandId));
}

/** Show the thing? Only when we KNOW they may. */
export function useCanShow(capability: string, brandId?: string | null): boolean {
  return useCan(capability, brandId) === true;
}

/** Show the "you can't" treatment? Only when we know they may NOT. */
export function useIsDenied(capability: string, brandId?: string | null): boolean {
  return useCan(capability, brandId) === false;
}

/** Still waiting: render a skeleton rather than either branch. */
export function useAccessUnknown(): boolean {
  return useAccessStore((s) => s.phase === 'unknown');
}

export function useCurrentWorkspace(): WorkspaceAccess | null {
  return useAccessStore((s) => s.workspaces.find((w) => w.id === s.currentWorkspaceId) ?? null);
}

export function useWorkspaces(): WorkspaceAccess[] {
  return useAccessStore((s) => s.workspaces);
}

/** Everything the user may do in one brand, for a surface that asks many questions. */
export function useBrandAccess(brandId?: string | null) {
  const entry = useAccessStore((s) => (brandId ? s.brands[brandId] : undefined));
  const loaded = useAccessStore((s) => s.brandsLoadedFor === s.currentWorkspaceId);
  const membership = useAccessStore((s) => s.membership());
  const ref = useAccessStore((s) => (brandId ? s.brandRef(brandId) : null));

  const caps = entry
    ? new Set(entry.capabilities)
    : ref ? effectiveCapabilities(membership, ref) : new Set<string>();

  return {
    loading: !loaded,
    /** null when the brand is not reachable at all — the 403/404 branch */
    role: entry?.role ?? null,
    archived: entry?.archived ?? false,
    can: useCallback((c: string) => caps.has(c), [caps]),
    capabilities: caps,
  };
}

/** Hydrate on mount for surfaces that can be entered directly (deep links, refreshes). */
export function useEnsureAccess(): void {
  const phase = useAccessStore((s) => s.phase);
  const hydrate = useAccessStore((s) => s.hydrate);
  useEffect(() => {
    if (phase === 'unknown') void hydrate();
  }, [phase, hydrate]);
}
