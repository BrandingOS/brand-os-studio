/**
 * The flow's working state.
 *
 * Session-scoped on purpose: a half-built identity is a draft, not a brand.
 * The brand is created once, when the owner approves the system (Build), and
 * from then on the brand record is the source of truth — this store only
 * remembers which brand it built so the package page survives a reload.
 *
 * The step is NOT here. It lives in the URL (`?step=`), so Back and Forward
 * are ordinary route changes and a reload lands where the owner was — the
 * same rule `/onboard-brand` follows.
 */
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type {
  BrandContext,
  BrandSystem,
  Direction,
  LogoRead,
  LogoSource,
  SystemSection,
} from './types';

export interface LogoFlowState {
  logo: LogoSource | null;
  read: LogoRead | null;
  context: BrandContext;
  directions: Direction[];
  /** Increments with every "show me different ones". */
  round: number;
  /** Archetypes already shown, so a new round brings new ones. */
  shown: string[];
  /** What the directions were generated from; a change means they are stale. */
  basis: string;
  system: BrandSystem | null;
  committed: { brandId: string; slug: string } | null;

  setLogo(logo: LogoSource | null): void;
  setRead(read: LogoRead | null): void;
  updateContext(patch: Partial<BrandContext>): void;
  setDirections(directions: Direction[], round: number, basis: string): void;
  choose(system: BrandSystem): void;
  updateSystem(patch: Partial<BrandSystem>): void;
  approve(section: SystemSection, approved: boolean): void;
  setCommitted(c: { brandId: string; slug: string } | null): void;
  reset(): void;
}

export const EMPTY_CONTEXT: BrandContext = {
  name: '',
  oneLiner: '',
  personality: [],
  loveHues: [],
  avoidHues: [],
};

const INITIAL = {
  logo: null,
  read: null,
  context: EMPTY_CONTEXT,
  directions: [],
  round: 0,
  shown: [],
  basis: '',
  system: null,
  committed: null,
};

/**
 * sessionStorage that never throws. A large raster logo can exceed the quota;
 * losing the draft on reload is acceptable, crashing the flow is not.
 */
const safeSession: StateStorage = {
  getItem: (k) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      sessionStorage.setItem(k, v);
    } catch {
      /* over quota — keep working in memory */
    }
  },
  removeItem: (k) => {
    try {
      sessionStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  },
};

export const STORAGE_KEY = 'brandos:logo-flow';

export const useLogoFlow = create<LogoFlowState>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      setLogo: (logo) =>
        // A new logo invalidates everything that was read from the old one.
        set({ logo, read: null, directions: [], round: 0, shown: [], basis: '', system: null }),
      setRead: (read) => set({ read }),
      updateContext: (patch) => set({ context: { ...get().context, ...patch } }),
      setDirections: (directions, round, basis) =>
        set({
          directions,
          round,
          basis,
          shown: Array.from(new Set([...get().shown, ...directions.map((d) => d.archetypeId)])),
        }),
      choose: (system) => set({ system }),
      updateSystem: (patch) => {
        const current = get().system;
        if (current) set({ system: { ...current, ...patch } });
      },
      approve: (section, approved) => {
        const current = get().system;
        if (!current) return;
        const without = current.approved.filter((s) => s !== section);
        set({ system: { ...current, approved: approved ? [...without, section] : without } });
      },
      setCommitted: (committed) => set({ committed }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => safeSession),
      version: 1,
      partialize: (s) => ({
        logo: s.logo,
        read: s.read,
        context: s.context,
        directions: s.directions,
        round: s.round,
        shown: s.shown,
        basis: s.basis,
        system: s.system,
        committed: s.committed,
      }),
    },
  ),
);
