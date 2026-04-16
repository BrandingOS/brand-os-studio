// IdentityEngine — the facade. Phase 11 ships the in-memory implementation
// (draft-only, localStorage-backed). Phase 13 adds a Supabase implementation
// that satisfies the same interface and a persistence migration path for
// anonymous → authenticated handoffs.

import type { Brief } from '../flow/state/types';
import { DEFAULT_PALETTE, DEFAULT_TYPOGRAPHY } from '../flow/utils/brand-context';
import { generateAllVariants } from './variants/generator';
import type {
  ColorSystem,
  CreationMode,
  IdentityEngineContext,
  IdentitySystem,
  LogoDocument,
  QualityReport,
  TypographySystem,
  VariantId,
} from './types';

const STORAGE_PREFIX = 'identity-engine:';

function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `idn_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function blankLogo(): LogoDocument {
  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" />',
    groups: {},
    bounds: { width: 400, height: 400 },
  };
}

function blankQuality(): QualityReport {
  return {
    contrast: { score: 'good', detail: 'Not yet evaluated' },
    scalability: { score: 'good', detail: 'Not yet evaluated' },
    readability: { score: 'good', detail: 'Not yet evaluated' },
    balance: { score: 'good', detail: 'Not yet evaluated' },
    detailDensity: { score: 'good', detail: 'Not yet evaluated' },
    perVariant: {},
    overall: 'good',
    generatedAt: nowIso(),
  };
}

// Default color + typography systems until the continuation flow populates
// real ones. Mirrors the Phase 6 DEFAULT_PALETTE / DEFAULT_TYPOGRAPHY.
function defaultColors(): ColorSystem {
  return {
    primary: DEFAULT_PALETTE.primary,
    secondary: DEFAULT_PALETTE.secondary,
    accents: DEFAULT_PALETTE.accents,
    neutrals: DEFAULT_PALETTE.neutrals,
  };
}

function defaultTypography(): TypographySystem {
  return {
    heading: {
      family: DEFAULT_TYPOGRAPHY.heading.family,
      weights: DEFAULT_TYPOGRAPHY.heading.weights,
      source: 'google',
      fallback: 'sans-serif',
    },
    body: {
      family: DEFAULT_TYPOGRAPHY.body.family,
      weights: DEFAULT_TYPOGRAPHY.body.weights,
      source: 'google',
      fallback: 'sans-serif',
    },
    mono: {
      family: DEFAULT_TYPOGRAPHY.mono.family,
      weights: DEFAULT_TYPOGRAPHY.mono.weights,
      source: 'google',
      fallback: 'monospace',
    },
  };
}

export interface IdentityEngine {
  create(brief: Brief, mode: CreationMode, ctx: IdentityEngineContext): IdentitySystem;
  load(id: string): IdentitySystem | null;
  save(system: IdentitySystem): void;
  updatePrimary(id: string, svg: string): IdentitySystem | null;
  regenerateVariants(id: string): IdentitySystem | null;
  editVariant(id: string, variantId: VariantId, svg: string): IdentitySystem | null;
  approve(id: string): IdentitySystem | null;
  list(): IdentitySystem[];
}

// Phase 11: localStorage implementation. In Phase 13 we wrap this with a
// SupabaseIdentityEngine and a migration adapter.
export function createLocalEngine(): IdentityEngine {
  function key(id: string) {
    return `${STORAGE_PREFIX}${id}`;
  }

  function read(id: string): IdentitySystem | null {
    try {
      const raw = localStorage.getItem(key(id));
      return raw ? (JSON.parse(raw) as IdentitySystem) : null;
    } catch {
      return null;
    }
  }

  function write(system: IdentitySystem): void {
    localStorage.setItem(key(system.id), JSON.stringify(system));
  }

  return {
    create(brief, mode, ctx) {
      const primary = blankLogo();
      const colors = defaultColors();
      const variantsMap = generateAllVariants({
        primary,
        colors,
        brandName: brief.name || 'Your brand',
      });

      const system: IdentitySystem = {
        id: newId(),
        brandId: ctx.brandId ?? null,
        version: 1,
        status: 'draft',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        primary,
        variants: variantsMap,
        colors,
        typography: defaultTypography(),
        quality: blankQuality(),
        brief,
        direction: null,
        conceptId: null,
        parentId: null,
        generationMetadata: {
          mode,
          aiPrompts: [],
          iterationCount: 0,
          timeSpentSeconds: 0,
          directionIdsExplored: [],
          conceptsGenerated: 0,
          remixesCount: 0,
        },
      };
      write(system);
      return system;
    },

    load(id) {
      return read(id);
    },

    save(system) {
      write({ ...system, updatedAt: nowIso() });
    },

    updatePrimary(id, svg) {
      const system = read(id);
      if (!system) return null;
      const primary: LogoDocument = { ...system.primary, svg };
      const variants = generateAllVariants({
        primary,
        colors: system.colors,
        brandName: system.brief.name || 'Your brand',
      });
      const updated: IdentitySystem = {
        ...system,
        primary,
        variants,
        updatedAt: nowIso(),
        generationMetadata: {
          ...system.generationMetadata,
          iterationCount: system.generationMetadata.iterationCount + 1,
        },
      };
      write(updated);
      return updated;
    },

    regenerateVariants(id) {
      const system = read(id);
      if (!system) return null;
      const variants = generateAllVariants({
        primary: system.primary,
        colors: system.colors,
        brandName: system.brief.name || 'Your brand',
      });
      const updated: IdentitySystem = { ...system, variants, updatedAt: nowIso() };
      write(updated);
      return updated;
    },

    editVariant(id, variantId, svg) {
      const system = read(id);
      if (!system) return null;
      const existing = system.variants[variantId];
      if (!existing) return null;
      const updatedVariant: LogoDocument = { ...existing, svg };
      const updated: IdentitySystem = {
        ...system,
        variants: { ...system.variants, [variantId]: updatedVariant },
        updatedAt: nowIso(),
      };
      write(updated);
      return updated;
    },

    approve(id) {
      const system = read(id);
      if (!system) return null;
      const updated: IdentitySystem = {
        ...system,
        status: 'approved',
        version: system.version + 1,
        updatedAt: nowIso(),
      };
      write(updated);
      return updated;
    },

    list() {
      const out: IdentitySystem[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith(STORAGE_PREFIX)) continue;
        try {
          const raw = localStorage.getItem(k);
          if (raw) out.push(JSON.parse(raw) as IdentitySystem);
        } catch {
          // skip corrupt entries
        }
      }
      return out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },
  };
}

// Singleton for the current runtime. Phase 13 may swap this for a factory that
// reads from context to choose local vs. Supabase, but for now we only have one.
export const identityEngine: IdentityEngine = createLocalEngine();
