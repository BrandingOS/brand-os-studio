import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { container } from '@/core/container/ServiceContainer';
import { SERVICE_KEYS, type IBrandsService, type IAssetsService } from '@/core/types/services';
import type { BrandRepository } from '@/domain/brand/repository';
import { changeBrandTypographyFamilies } from '@/application/brand/changeBrandTypography';
import { toLegacyBrandPatch } from '@/domain/brand';
import { applyCorePatch, splitCorePatch } from './routeCoreWrite';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { recordCoreWriteFallback } from './coreWriteFallback';
import { currentCoreWriteOptions } from './currentActor';
import { projectLibraryOntoBrand } from '@/shared/brand/libraryProjection';
import type { Asset } from '@/shared/types/brand';
import type { Brand, CreateBrandInput } from '../types/brand';
import { loadBrandFonts } from '@/shared/design-system/fonts';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';
import type { Typescale } from '@/shared/types/typescale';
import type { TypographySystem, FontToken, FontScaleTokens } from '@/shared/types/brandAssets';

/**
 * Helper to get the brands service from the DI container.
 * This is the ONLY place the store touches the service layer.
 */
function getBrandsService(): IBrandsService {
  return container.get<IBrandsService>(SERVICE_KEYS.BRANDS);
}

/**
 * Hydrates the read-only Library projection onto a brand.
 *
 * ~34 modules resolve logoSystem refs synchronously via
 * `brand.brandAssets.find(...)` inside render paths, so the async Library is
 * projected onto the brand HERE, once, as it enters the store. The readers stay
 * untouched and a newly-uploaded asset appears through them immediately.
 *
 * Read-only by construction: this runs after the service returns, and
 * `update()` strips `brandAssets` from patches so the projection can never be
 * written back. See shared/brand/libraryProjection.ts for the retirement
 * criterion.
 */
async function withLibraryProjection<T extends Brand | undefined | null>(brand: T): Promise<T> {
  if (!brand) return brand;
  try {
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    // Tombstones included: the projection needs them to subtract stale stored
    // aliases of deleted assets (see libraryProjection).
    const items: Asset[] = await assets.listLibrary(brand.id, {
      includeArchived: true,
      includeDeleted: true,
    });
    return projectLibraryOntoBrand(brand, items) as T;
  } catch {
    // The projection is an enhancement, never a gate: if the Library cannot be
    // read, the brand still loads with whatever stored assets it has.
    return brand;
  }
}

async function projectAll(brands: Brand[]): Promise<Brand[]> {
  return Promise.all(brands.map((b) => withLibraryProjection(b)));
}

interface BrandStore {
  list: Brand[];
  current?: Brand;
  isLoading: boolean;
  error?: string;

  loadById: (id: string) => Promise<void>;
  loadBySlug: (slug: string) => Promise<void>;
  create: (input: CreateBrandInput) => Promise<Brand>;
  update: (id: string, patch: Partial<Brand>) => Promise<void>;
  delete: (id: string) => Promise<void>;
  loadAll: () => Promise<void>;
  setCurrent: (brand: Brand | undefined) => void;
  setError: (error: string | undefined) => void;
  setLoading: (loading: boolean) => void;
  setTypescale: (brandId: string, next: Typescale) => Promise<void>;
  /** Re-hydrate the read-only Library projection for one brand. */
  reprojectLibrary: (brandId: string) => Promise<void>;
}

function fallbacksFromString(fallback: string): string[] {
  return fallback.split(',').map(s => s.trim()).filter(Boolean);
}

function fontTokenFromRef(ref: { family: string; weights: number[]; fallback: string; files?: { url: string }[] }): FontToken {
  return {
    family: ref.family,
    weights: ref.weights,
    fallbacks: fallbacksFromString(ref.fallback),
    url: ref.files?.[0]?.url,
  };
}

export function mirrorTypographyFromTypescale(
  current: TypographySystem | undefined,
  next: Typescale,
): TypographySystem {
  const web = next.surfaces.web;
  const byId = new Map(web.steps.map(s => [s.id, s]));
  const pick = (role: keyof typeof web.semantic): string | undefined => {
    const entry = web.semantic[role];
    if (!entry) return undefined;
    const step = byId.get(entry.stepId);
    return step ? `${step.sizePx}px` : undefined;
  };
  const scale: FontScaleTokens = {
    h1: pick('h1'),
    h2: pick('h2'),
    h3: pick('h3'),
    h4: pick('h4'),
    h5: pick('h5'),
    h6: pick('h6'),
    body: pick('body'),
    bodyLarge: pick('bodyLg'),
    bodySmall: pick('bodySm'),
    caption: pick('caption'),
    overline: pick('overline'),
  };
  return {
    ...(current ?? {}),
    primary: { ...(current?.primary ?? {}), ...fontTokenFromRef(next.fonts.heading) },
    secondary: { ...(current?.secondary ?? {}), ...fontTokenFromRef(next.fonts.body) },
    accent: next.fonts.mono
      ? { ...(current?.accent ?? {}), ...fontTokenFromRef(next.fonts.mono) }
      : current?.accent,
    scale,
  };
}

export const useBrandStore = create<BrandStore>()(
  devtools(
    (set) => ({
      list: [],
      current: undefined,
      isLoading: false,
      error: undefined,

      loadById: async (id: string) => {
        set({ isLoading: true, error: undefined }, false, 'loadById/start');
        try {
          const brand = await withLibraryProjection(await getBrandsService().getById(id));
          set({ current: brand ?? undefined, isLoading: false }, false, 'loadById/success');
          if (brand) { loadBrandFonts(brand); applyBrandTokens(brand); }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load brand', isLoading: false }, false, 'loadById/error');
        }
      },

      loadBySlug: async (slug: string) => {
        set({ isLoading: true, error: undefined }, false, 'loadBySlug/start');
        try {
          const brand = await withLibraryProjection(await getBrandsService().getBySlug(slug));
          set({ current: brand ?? undefined, isLoading: false }, false, 'loadBySlug/success');
          if (brand) { loadBrandFonts(brand); applyBrandTokens(brand); }
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load brand', isLoading: false }, false, 'loadBySlug/error');
        }
      },

      create: async (input: CreateBrandInput) => {
        set({ isLoading: true, error: undefined }, false, 'create/start');
        try {
          const brand = await getBrandsService().create(input);
          set((state) => ({
            list: [...state.list, brand],
            current: brand,
            isLoading: false,
          }), false, 'create/success');
          return brand;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to create brand', isLoading: false }, false, 'create/error');
          throw error;
        }
      },

      update: async (id: string, patch: Partial<Brand>) => {
        set({ isLoading: true, error: undefined }, false, 'update/start');
        try {
          // ── One canonical write path for Brand Core ──────────────────
          // Core subsystems are rerouted through the application-layer ops
          // that own them, so a colour saved here and a colour saved from
          // Setup travel the same road. Non-Core fields (name, publicUrl,
          // assets, …) keep the existing service path untouched.
          // `brandAssets` is a DERIVED projection of the Library, hydrated by
          // withLibraryProjection. Persisting it would turn a read-only view
          // into a second write path for asset truth — the exact thing the
          // Library convergence removes. Strip it, loudly in dev.
          if (patch.brandAssets !== undefined) {
            if (import.meta.env.DEV) {
              console.warn(
                '[brandStore] Ignoring `brandAssets` in an update patch: it is a ' +
                  'read-only projection of the Brand Library. Write assets through ' +
                  'IAssetsService instead.',
              );
            }
            const { brandAssets: _projected, ...withoutProjection } = patch;
            patch = withoutProjection;
          }

          // Renaming a project, or giving it a cover, is not editing the BRAND.
          // Left alone, `updatedAt` would move — so the card would claim the
          // brand was edited, and every surface that orders by recency would
          // reshuffle around a change to a label. Carry the old timestamp with
          // the write; the services that honour it keep the brand's real
          // last-edited date.
          const cardOnly =
            patch.workspaceCard !== undefined &&
            Object.keys(patch).every((k) => k === 'workspaceCard' || k === 'updatedAt');
          if (cardOnly && patch.updatedAt === undefined) {
            const before =
              useBrandStore.getState().list.find((b) => b.id === id) ??
              useBrandStore.getState().current;
            if (before?.updatedAt) patch = { ...patch, updatedAt: before.updatedAt };
          }

          const { core, rest, routedKeys, unroutedCoreKeys } = splitCorePatch(patch);

          if (import.meta.env.DEV && unroutedCoreKeys.length) {
            // Honest about what is still open: logos have no canonical op yet,
            // so they legitimately travel the legacy path for now.
            console.warn(
              `[brandStore] Core fields with no canonical op yet: ${unroutedCoreKeys.join(', ')}. ` +
                'These still write through IBrandsService directly.',
            );
          }

          let canonicalPatch: Partial<Brand> = {};
          if (routedKeys.length) {
            const repo = container.get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);
            try {
              // WHO is writing travels with the write. This store's `update`
              // is the single funnel every UI Core edit passes through, so
              // attributing here reaches all of them without threading an
              // actor through each call site.
              const canonical = await applyCorePatch(repo, id, core, currentCoreWriteOptions());
              if (canonical) canonicalPatch = toLegacyBrandPatch(canonical);
            } catch (routingError) {
              // Transitional safety valve. A canonical op validates the whole
              // brand, so a previously-tolerated malformed record could start
              // failing a save that used to work. In DEV that must be loud; in
              // production the user's edit still lands via the legacy path.
              //
              // Every use is RECORDED (coreWriteFallback.ts) — a silent
              // fallback would let convergence stall on some brand forever with
              // nobody the wiser. Removal criterion unchanged: delete this
              // branch once no brand fails canonical validation, which the
              // recorder's zero-count is the evidence for.
              if (import.meta.env.DEV) throw routingError;
              recordCoreWriteFallback(id, routedKeys, routingError);
              // MERGE, never assign. splitCorePatch cuts `guidelines` in two —
              // core keeps strategy/aboutSections, rest keeps colorPalette,
              // iconography, socialMedia, applications. A plain Object.assign
              // would overwrite rest.guidelines with the Core-only half, and
              // since the service persists `guidelines` as a whole value, the
              // caller's other sections would be erased from the record.
              const { guidelines: coreGuidelines, ...coreRest } = core;
              Object.assign(rest, coreRest);
              if (coreGuidelines) {
                rest.guidelines = { ...(rest.guidelines ?? {}), ...coreGuidelines };
              }
            }
          }

          // Use the service's return value — it's fully MIGRATED, so derived
          // fields (brandAssets, logoSystem, colorSystem) reflect the patch.
          // The old `{ ...current, ...patch }` merge left stale derivations
          // on a schemaVersion-current object nothing would ever recompute.
          // A Core-only patch has already been persisted by the canonical op, so
          // re-read rather than issuing a second write. `?? current` keeps the
          // store consistent if the read comes back empty for any reason.
          const needsServiceWrite = Object.keys(rest).length > 0 || !routedKeys.length;
          // The store's own copies are ALREADY projected, so they cannot be fed
          // back in as projection input: a projection of a projection treats
          // last round's derived entries as stored legacy data, and items the
          // Library has tombstoned reappear. Strip the derived array so the
          // fallback re-enters the pipeline as un-projected material — the same
          // rule `reprojectLibrary` follows.
          const fromStore = () => {
            const cached =
              useBrandStore.getState().list.find((b) => b.id === id) ??
              useBrandStore.getState().current;
            if (!cached) return cached;
            const { brandAssets: _projected, ...unprojected } = cached;
            return unprojected as Brand;
          };
          const base = needsServiceWrite
            ? await getBrandsService().update(id, rest)
            : ((await getBrandsService().getById(id)) ?? fromStore());
          // Re-migrate after merging the canonical patch so the identity blob
          // re-hydrates every legacy read-home — including `guidelines.strategy`,
          // which the patch deliberately does not carry. Without this, store
          // readers would show stale strategy until the next reload.
          const updated = canonicalPatch.identity
            ? migrateBrandToCurrent({ ...(base as Brand), ...canonicalPatch })
            : ({ ...(base as Brand), ...canonicalPatch } as Brand);

          // Re-project: an upload that just landed in the Library must be
          // visible through the synchronous readers without a reload.
          const projected = await withLibraryProjection(updated);
          set((state) => ({
            list: state.list.map(brand => (brand.id === id ? projected : brand)),
            current: state.current?.id === id ? projected : state.current,
            isLoading: false,
          }), false, 'update/success');
          if (patch.fonts || patch.primaryColor || patch.secondaryColor || patch.typescale || patch.typography) {
            loadBrandFonts(updated);
            applyBrandTokens(updated);
          }
        } catch (error) {
          // Re-throw so callers (e.g. the Setup persist wrapper) can
          // surface the failure to the user. Without this, persist
          // errors (notably localStorage quota for big font uploads)
          // get swallowed and the user sees no feedback while their
          // edit silently fails to save.
          const message = error instanceof Error ? error.message : 'Failed to update brand';
          set({ error: message, isLoading: false }, false, 'update/error');
          throw error;
        }
      },

      setTypescale: async (brandId: string, next: Typescale) => {
        // Typescale tool is preview-only EXCEPT for font-family changes:
        // Heading/Body selection (including uploaded fonts) writes back
        // to brand.fonts.primary / brand.fonts.secondary. Scale, ratio,
        // leading, tracking, semantic map, and activeSurface stay in
        // local draft state and are thrown away on reload.
        const current = useBrandStore.getState().list.find(b => b.id === brandId)
                      ?? (useBrandStore.getState().current?.id === brandId ? useBrandStore.getState().current : undefined);
        if (!current) return;

        const nextPrimary = next.fonts?.heading?.family ?? current.fonts?.primary;
        const nextSecondary = next.fonts?.body?.family ?? current.fonts?.secondary;
        if (
          nextPrimary === current.fonts?.primary &&
          nextSecondary === current.fonts?.secondary
        ) return;

        // Route the family change through the ONE canonical typography op so the
        // identity blob (authoritative after the flip) stays in sync — a direct
        // `update({fonts})` would be overridden by the blob on the next read.
        const repo = container.get<BrandRepository>(SERVICE_KEYS.BRAND_REPOSITORY);
        const updated = await changeBrandTypographyFamilies(repo, brandId, {
          primary: nextPrimary,
          secondary: nextSecondary,
        });
        const patch = toLegacyBrandPatch(updated);
        set((state) => ({
          current: state.current?.id === brandId ? { ...state.current, ...patch } : state.current,
          list: state.list.map((b) => (b.id === brandId ? { ...b, ...patch } : b)),
        }), false, 'setTypescale');
      },

      delete: async (id: string) => {
        set({ isLoading: true, error: undefined }, false, 'delete/start');
        try {
          await getBrandsService().delete(id);
          set((state) => ({
            list: state.list.filter(brand => brand.id !== id),
            current: state.current?.id === id ? undefined : state.current,
            isLoading: false,
          }), false, 'delete/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to delete brand', isLoading: false }, false, 'delete/error');
        }
      },

      loadAll: async () => {
        set({ isLoading: true, error: undefined }, false, 'loadAll/start');
        try {
          const brands = await projectAll(await getBrandsService().list());
          set({ list: brands, isLoading: false }, false, 'loadAll/success');
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Failed to load brands', isLoading: false }, false, 'loadAll/error');
        }
      },

      reprojectLibrary: async (brandId: string) => {
        // Called after a Library write so the synchronous readers
        // (useBrandLogo and friends) see the new asset without a reload.
        //
        // Re-reads the brand from the SERVICE rather than reusing store state:
        // store state already carries a projection, and projecting a projection
        // treats last round's derived entries as stored legacy data — which
        // resurrects items the Library has since tombstoned. Starting from the
        // un-projected record makes the projection idempotent by construction.
        const target = await getBrandsService().getById(brandId);
        if (!target) return;
        const projected = await withLibraryProjection(target);
        set((state) => ({
          list: state.list.map((b) => (b.id === brandId ? projected : b)),
          current: state.current?.id === brandId ? projected : state.current,
        }), false, 'reprojectLibrary');
      },

      setCurrent: (brand) => set({ current: brand }, false, 'setCurrent'),
      setError: (error) => set({ error }, false, 'setError'),
      setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),
    }),
    { name: 'brand-store' }
  )
);
