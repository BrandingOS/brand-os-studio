/**
 * Zustand store for the Brand Kit deliverable lifecycle. Owns the
 * per-brand deliverable records, the transient `generating` set, and
 * every state transition (generate / review / approve / manage). All
 * mutations persist through the `KitStateRepository` boundary — the
 * store never touches localStorage directly.
 */
import { create } from 'zustand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { loadBrandCustomizations } from '../data/cardCustomizations';
import type { SavedCardCustomization } from '../data/cardCustomizations';
import { variantsForCard } from '../data/legacy-mapping';
import {
  emptyKitState,
  emptyRecord,
  approvedItems,
  candidateItems,
  deriveStatus,
  type BrandKitState,
  type DeliverableKey,
  type DeliverableRecord,
  type DeliverableStatus,
  type KitItem,
} from './types';
import { DELIVERABLES, getDeliverableByKey } from './registry';
import { defaultKitGenerator, type GenerationContext, type KitGenerator } from './generation';
import { getKitStateRepository } from './repository';

let itemCounter = 0;
function nextItemId(): string {
  itemCounter += 1;
  return `ki_${Date.now().toString(36)}_${itemCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

/** Minimum visible "generating" duration so the reveal reads as work
 *  happening — the deterministic generator itself is instant. */
const DEFAULT_MIN_GENERATION_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type KitStoreState = {
  brandId: string | null;
  deliverables: Record<DeliverableKey, DeliverableRecord>;
  generatingKeys: DeliverableKey[];

  hydrate: (brandId: string, brand: MockBrand) => Promise<void>;
  generate: (
    keys: DeliverableKey[],
    ctx: GenerationContext,
    opts?: { minDelayMs?: number; generator?: KitGenerator },
  ) => Promise<void>;
  regenerate: (
    key: DeliverableKey,
    ctx: GenerationContext,
    opts?: { minDelayMs?: number; generator?: KitGenerator },
  ) => Promise<void>;
  approve: (key: DeliverableKey, itemId: string) => void;
  approveTopCandidates: (keys: DeliverableKey[]) => void;
  dismissCandidates: (key: DeliverableKey) => void;
  addApprovedItem: (key: DeliverableKey, variantId: string) => void;
  setPrimary: (key: DeliverableKey, itemId: string) => void;
  duplicateItem: (key: DeliverableKey, itemId: string) => void;
  removeItem: (key: DeliverableKey, itemId: string) => void;
  archiveItem: (key: DeliverableKey, itemId: string) => void;
  updateItemCustomization: (
    key: DeliverableKey,
    itemId: string,
    customization: SavedCardCustomization | null,
  ) => void;
  clearError: (key: DeliverableKey) => void;
};

/**
 * In-flight hydrations, keyed by brand id.
 *
 * A single-slot guard had two defects. A second call for the SAME brand
 * returned an already-resolved promise, so `await hydrate(id, brand)` continued
 * with `brandId: null` and empty deliverables — a component mounting twice in
 * one tick reads an empty kit. And with two different brands in flight, the
 * later call overwrote the slot and its `finally` cleared the guard while the
 * first was still loading, so the winner was decided by completion order rather
 * than call order. Returning the SAME promise per brand fixes both.
 */
const hydrating = new Map<string, Promise<void>>();

/** The brand the UI most recently asked to hydrate. See `hydrate`. */
let requestedBrandId: string | null = null;

/**
 * Per-brand write queue.
 *
 * Saves are fire-and-forget, so two quick mutations previously raced: both
 * requests were in flight at once and the server kept whichever ARRIVED last,
 * which is not necessarily the one issued last. Approving an item and then
 * archiving it could persist the approve — the user's last action silently
 * undone on the next reload.
 *
 * Chaining per brand makes arrival order equal issue order. Different brands
 * stay independent, and a failed save does not break the chain behind it.
 */
const saveQueues = new Map<string, Promise<unknown>>();

function persist(brandId: string | null, deliverables: Record<DeliverableKey, DeliverableRecord>) {
  if (!brandId) return;
  const state: BrandKitState = { version: 1, deliverables };
  // Still fire-and-forget from the caller's side, as it always was: the boolean
  // was never awaited, and a failed kit write must not break the interaction
  // that triggered it.
  const write = () =>
    getKitStateRepository()
      .save(brandId, state)
      .catch(() => {
        /* persistence failure is non-fatal; state stays in memory */
      });

  const prior = saveQueues.get(brandId);
  // With nothing in flight, start IMMEDIATELY rather than after a microtask.
  // Deferring unconditionally would delay every first save by a tick for no
  // benefit — there is nothing to order against.
  const queued = (prior
    ? prior
        .catch(() => {
          /* an earlier failure must not cancel later writes */
        })
        .then(write)
    : write()
  )
    .finally(() => {
      // Only the tail clears the slot, so a later save never joins a chain
      // that has already been replaced.
      if (saveQueues.get(brandId) === queued) saveQueues.delete(brandId);
    });
  saveQueues.set(brandId, queued);
}

/** Fix up primaryItemId after item mutations: keep it when still
 *  approved, else promote the first approved item, else null. */
function normalizePrimary(record: DeliverableRecord): DeliverableRecord {
  const approved = approvedItems(record);
  if (approved.length === 0) return { ...record, primaryItemId: null };
  if (approved.some((i) => i.id === record.primaryItemId)) return record;
  return { ...record, primaryItemId: approved[0].id };
}

/** Seed kit state from pre-redesign card-editor saves so users who
 *  customized cards before the redesign keep them as approved items. */
function migrateFromCardCustomizations(brandId: string, brand: MockBrand): BrandKitState {
  const state = emptyKitState();
  const saved = loadBrandCustomizations(brandId);
  const savedKeys = Object.keys(saved).filter((k) => !k.startsWith('label:'));
  if (savedKeys.length === 0) return state;

  for (const def of DELIVERABLES) {
    const variantIds = new Set(
      variantsForCard(def.sectionKey, def.label, brand).map((t) => t.id),
    );
    const matches = savedKeys.filter((k) => variantIds.has(k));
    if (matches.length === 0) continue;
    const ts = now();
    const items: KitItem[] = matches.map((variantId) => ({
      id: nextItemId(),
      variantId,
      status: 'approved',
      customization: saved[variantId],
      createdAt: saved[variantId].savedAt ?? ts,
      approvedAt: saved[variantId].savedAt ?? ts,
    }));
    state.deliverables[def.key] = {
      items,
      primaryItemId: items[0].id,
      error: null,
      seenVariantIds: matches,
      updatedAt: ts,
    };
  }
  return state;
}

export const useKitStore = create<KitStoreState>((set, get) => {
  /** Apply `fn` to one record (created empty if missing), persist, set. */
  function updateRecord(
    key: DeliverableKey,
    fn: (record: DeliverableRecord) => DeliverableRecord,
  ) {
    const { brandId, deliverables } = get();
    const prev = deliverables[key] ?? emptyRecord(now());
    const nextRecord = { ...fn(prev), updatedAt: now() };
    const next = { ...deliverables, [key]: nextRecord };
    persist(brandId, next);
    set({ deliverables: next });
  }

  async function runGeneration(
    keys: DeliverableKey[],
    ctx: GenerationContext,
    opts?: { minDelayMs?: number; generator?: KitGenerator },
  ) {
    const generator = opts?.generator ?? defaultKitGenerator;
    const minDelayMs = opts?.minDelayMs ?? DEFAULT_MIN_GENERATION_MS;
    const valid = keys.filter((k) => getDeliverableByKey(k));
    if (valid.length === 0) return;

    set((s) => ({
      generatingKeys: [...new Set([...s.generatingKeys, ...valid])],
    }));

    await Promise.all(
      valid.map(async (key) => {
        const def = getDeliverableByKey(key)!;
        const seen = get().deliverables[key]?.seenVariantIds ?? [];
        try {
          const [result] = await Promise.all([
            generator.generate(def, ctx, { exclude: seen }),
            minDelayMs > 0 ? delay(minDelayMs) : Promise.resolve(),
          ]);
          const ts = now();
          updateRecord(key, (record) => ({
            ...record,
            error: null,
            // Replace prior candidates; approved/archived items stay.
            items: [
              ...record.items.filter((i) => i.status !== 'candidate'),
              ...result.candidates.map((t) => ({
                id: nextItemId(),
                variantId: t.id,
                status: 'candidate' as const,
                customization: null,
                createdAt: ts,
              })),
            ],
            seenVariantIds: [
              ...new Set([...(record.seenVariantIds ?? []), ...result.candidates.map((t) => t.id)]),
            ],
          }));
        } catch (err) {
          updateRecord(key, (record) => ({
            ...record,
            error: err instanceof Error ? err.message : 'Generation failed',
          }));
        } finally {
          set((s) => ({ generatingKeys: s.generatingKeys.filter((k) => k !== key) }));
        }
      }),
    );
  }

  return {
    brandId: null,
    deliverables: {},
    generatingKeys: [],

    hydrate: async (brandId, brand) => {
      if (get().brandId === brandId) return;

      // Join the in-flight hydration for this brand rather than returning
      // early, so every caller awaits real completion.
      const existing = hydrating.get(brandId);
      if (existing) return existing;

      // Which brand the UI is actually asking for RIGHT NOW. A load that
      // finishes after the user has navigated on must not install its brand:
      // hydrating A, then B, with A completing last would put A's kit on
      // screen while the UI shows B.
      requestedBrandId = brandId;

      const run = (async () => {
        const repo = getKitStateRepository();
        let state = await repo.load(brandId);
        if (!state) {
          state = migrateFromCardCustomizations(brandId, brand);
          await repo.save(brandId, state);
        }
        if (requestedBrandId !== brandId) return; // superseded — drop the result
        set({ brandId, deliverables: state.deliverables, generatingKeys: [] });
      })().finally(() => {
        hydrating.delete(brandId);
      });

      hydrating.set(brandId, run);
      return run;
    },

    generate: (keys, ctx, opts) => runGeneration(keys, ctx, opts),

    regenerate: (key, ctx, opts) => runGeneration([key], ctx, opts),

    approve: (key, itemId) => {
      updateRecord(key, (record) => {
        const target = record.items.find((i) => i.id === itemId);
        if (!target || target.status === 'approved') return record;
        // Approving a candidate resolves the review round: the chosen
        // item is owned, the remaining candidates are dropped.
        const items = record.items
          .filter((i) => i.status !== 'candidate' || i.id === itemId)
          .map((i) =>
            i.id === itemId
              ? { ...i, status: 'approved' as const, approvedAt: now() }
              : i,
          );
        return normalizePrimary({
          ...record,
          items,
          primaryItemId: record.primaryItemId ?? itemId,
        });
      });
    },

    approveTopCandidates: (keys) => {
      const { deliverables } = get();
      for (const key of keys) {
        const first = candidateItems(deliverables[key])[0];
        if (first) get().approve(key, first.id);
      }
    },

    dismissCandidates: (key) => {
      updateRecord(key, (record) => ({
        ...record,
        items: record.items.filter((i) => i.status !== 'candidate'),
      }));
    },

    addApprovedItem: (key, variantId) => {
      updateRecord(key, (record) => {
        const ts = now();
        const item: KitItem = {
          id: nextItemId(),
          variantId,
          status: 'approved',
          customization: null,
          createdAt: ts,
          approvedAt: ts,
        };
        return normalizePrimary({
          ...record,
          items: [...record.items, item],
          primaryItemId: record.primaryItemId ?? item.id,
          seenVariantIds: [...new Set([...(record.seenVariantIds ?? []), variantId])],
        });
      });
    },

    setPrimary: (key, itemId) => {
      updateRecord(key, (record) => {
        const target = record.items.find((i) => i.id === itemId);
        if (!target || target.status !== 'approved') return record;
        return { ...record, primaryItemId: itemId };
      });
    },

    duplicateItem: (key, itemId) => {
      updateRecord(key, (record) => {
        const source = record.items.find((i) => i.id === itemId);
        if (!source || source.status !== 'approved') return record;
        const ts = now();
        const copy: KitItem = {
          ...source,
          id: nextItemId(),
          customization: source.customization ? { ...source.customization } : null,
          createdAt: ts,
          approvedAt: ts,
        };
        return { ...record, items: [...record.items, copy] };
      });
    },

    removeItem: (key, itemId) => {
      updateRecord(key, (record) =>
        normalizePrimary({
          ...record,
          items: record.items.filter((i) => i.id !== itemId),
        }),
      );
    },

    archiveItem: (key, itemId) => {
      updateRecord(key, (record) =>
        normalizePrimary({
          ...record,
          items: record.items.map((i) =>
            i.id === itemId ? { ...i, status: 'archived' as const } : i,
          ),
        }),
      );
    },

    updateItemCustomization: (key, itemId, customization) => {
      updateRecord(key, (record) => ({
        ...record,
        items: record.items.map((i) => (i.id === itemId ? { ...i, customization } : i)),
      }));
    },

    clearError: (key) => {
      updateRecord(key, (record) => ({ ...record, error: null }));
    },
  };
});

/* ── Selector helpers (plain functions over store state) ──────────── */

export function statusOf(
  state: Pick<KitStoreState, 'deliverables' | 'generatingKeys'>,
  key: DeliverableKey,
): DeliverableStatus {
  return deriveStatus(state.deliverables[key], state.generatingKeys.includes(key));
}

/** Kit-wide progress: approved deliverables / total deliverables. */
export function kitCounts(state: Pick<KitStoreState, 'deliverables' | 'generatingKeys'>): {
  approved: number;
  review: number;
  total: number;
} {
  let approved = 0;
  let review = 0;
  for (const def of DELIVERABLES) {
    const status = statusOf(state, def.key);
    if (status === 'approved') approved += 1;
    else if (status === 'review') review += 1;
  }
  return { approved, review, total: DELIVERABLES.length };
}
