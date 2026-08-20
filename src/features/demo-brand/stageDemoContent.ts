/**
 * The two parts of the demo brand the database cannot carry.
 *
 * Migration 033 clones the demo brand in SQL, along with everything the
 * database holds for it: the brand record, its library assets, its folder tree
 * and its designs. Two surfaces are missing from that list, and not because of
 * this feature — kit lifecycle state (`brandos:brand-kit:state`) and guideline
 * documents (`brandos:guideline:docs`) have NO TABLE, for any brand. They
 * cannot be cloned by SQL because they are not in SQL.
 *
 * So they are DERIVED here instead, by calling the product's own generators
 * against the cloned brand. Nothing in this file is a fixture: change the
 * guideline builder or the kit generator and the demo changes with them,
 * rather than rotting into a snapshot that no longer matches the product.
 *
 * Two rules make this safe to run on every boot:
 *
 *   1. It only ever writes where there is NOTHING. A brand whose guideline or
 *      kit has been touched is left completely alone — including a demo brand
 *      the user has since emptied on purpose.
 *   2. It only runs for a brand the server flagged `is_demo`. It cannot reach
 *      a brand the user made.
 *
 * The known cost, stated plainly: this is per-browser. Signing in on a second
 * device brings the brand, its assets, folders and designs, and regenerates
 * the kit and guideline staging there rather than carrying it across. That is
 * a property of where those two stores live, not of the demo brand.
 */
import type { Brand } from '@/shared/types/brand';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { useGuidelineDocStore } from '@/features/guideline/model/guidelineDocStore';
import { getKitStateRepository } from '@/features/brand-kit/kit/repository';
import { defaultKitGenerator } from '@/features/brand-kit/kit/generation';
import { getDeliverableByKey } from '@/features/brand-kit/kit/registry';
import {
  deliverableKey,
  emptyKitState,
  emptyRecord,
  type DeliverableKey,
  type KitItem,
} from '@/features/brand-kit/kit/types';

/**
 * What the demo arrives with already approved — the four things every business
 * actually sends out. Deliberately not the whole catalogue: a kit where
 * everything is already done leaves the user nothing to do, and the point is
 * to show the workflow, not to skip it.
 */
const STAGED_DELIVERABLES: DeliverableKey[] = [
  deliverableKey('stationery', 'Business Card'),
  deliverableKey('stationery', 'Letterhead'),
  deliverableKey('stationery', 'Invoice'),
  deliverableKey('web', 'Email Signature'),
];

/** Brands staged in this tab, so a re-render cannot start the work twice. */
const inFlight = new Set<string>();

/**
 * Wait for the guideline store's `persist` rehydration.
 *
 * Without this the check below reads an EMPTY store during the first tick and
 * builds a document over one the user has already written — the single way
 * this file could destroy someone's work.
 */
function whenGuidelinesHydrated(): Promise<void> {
  if (useGuidelineDocStore.getState().hasHydrated) return Promise.resolve();
  return new Promise((resolve) => {
    const unsub = useGuidelineDocStore.subscribe((s) => {
      if (s.hasHydrated) {
        unsub();
        resolve();
      }
    });
  });
}

async function stageGuideline(brand: Brand): Promise<boolean> {
  await whenGuidelinesHydrated();
  const store = useGuidelineDocStore.getState();
  if (store.get(brand.id)) return false;
  store.build(brand);
  return true;
}

async function stageKit(brand: Brand): Promise<boolean> {
  const repo = getKitStateRepository();
  if (await repo.load(brand.id)) return false;

  const mock = brandToMockBrand(brand);
  const state = emptyKitState();
  const now = new Date().toISOString();

  for (const key of STAGED_DELIVERABLES) {
    const def = getDeliverableByKey(key);
    if (!def) continue;
    try {
      const { candidates } = await defaultKitGenerator.generate(def, {
        seed: brand.id,
        brand: mock,
      });
      const chosen = candidates[0];
      if (!chosen) continue;

      const item: KitItem = {
        id: `${key}::demo`,
        variantId: chosen.id,
        status: 'approved',
        customization: null,
        createdAt: now,
        approvedAt: now,
        origin: 'generated',
      };
      state.deliverables[key] = {
        ...emptyRecord(now),
        items: [item],
        primaryItemId: item.id,
        // Every candidate counts as seen, so "Show me more" walks FURTHER down
        // the ranked library rather than re-offering what is already approved.
        seenVariantIds: candidates.map((c) => c.id),
      };
    } catch {
      // A deliverable the brand cannot satisfy (no logo, no library entry) is
      // skipped. One missing card is not a reason to ship none of them.
    }
  }

  if (Object.keys(state.deliverables).length === 0) return false;
  return repo.save(brand.id, state);
}

/**
 * Stage one demo brand. Safe to call repeatedly; does nothing for a brand that
 * is not the demo, or whose content already exists.
 */
export async function stageDemoBrandContent(brand: Brand): Promise<void> {
  if (!brand?.isDemo || !brand.id) return;
  if (inFlight.has(brand.id)) return;
  inFlight.add(brand.id);
  try {
    await Promise.all([stageGuideline(brand), stageKit(brand)]);
  } catch (err) {
    // Staging is a nicety. It must never take the app down with it.
    console.error('[demo-brand] staging failed', err);
  }
}

/** Stage every demo brand in a list. */
export async function stageDemoBrands(brands: readonly Brand[]): Promise<void> {
  await Promise.all(brands.filter((b) => b?.isDemo).map(stageDemoBrandContent));
}

/** Test seam — the in-flight guard is module state. */
export function __resetDemoStagingForTests(): void {
  inFlight.clear();
}
