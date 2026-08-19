/**
 * Writing to the actual brand, from inside the guideline.
 *
 * There is exactly one supported road to a brand change and this is it:
 *
 *   brandToMockBrand(brand)  →  mutate  →  mockBrandToPatch(next, brand)
 *                            →  useBrandStore.update(brand.id, patch)
 *
 * That is byte-for-byte what `/b/:slug/setup` does, so `splitCorePatch`,
 * `applyCorePatch` and the `changeBrand*` canonical operations fire
 * identically — provenance, validation and the legacy fallback included.
 *
 * The contract that makes it safe: **`mockBrandToPatch` diffs a WHOLE
 * MockBrand against the stored brand.** Hand-building a partial one emits
 * destructive diffs — an empty `colors.core` wipes `primaryColor` and the
 * neutrals; an empty `about` clears the stored About sections. `edit()` below
 * removes that hazard by construction: the draft always starts from
 * `brandToMockBrand`, and callers only ever mutate it.
 */
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { mockBrandToPatch } from '@/features/setup/data/mockBrandToPatch';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';

/** A pending change to the brand, described before it is applied. */
export interface BrandChange {
  /** Dialog title — a question, because it is one. */
  title: string;
  /** What changes, concretely. Rendered inside the confirmation. */
  detail: React.ReactNode;
  apply: () => Promise<void>;
}

/**
 * Build a brand change from a mutation of the brand's Setup projection.
 *
 * Nothing is written until `apply()` runs, so the caller can put the whole
 * thing behind a confirmation and still describe it accurately.
 */
export function editBrand(
  brand: Brand,
  describe: { title: string; detail: React.ReactNode },
  mutate: (draft: MockBrand) => MockBrand,
): BrandChange {
  return {
    ...describe,
    apply: async () => {
      const current = brandToMockBrand(brand);
      const next = mutate(current);
      const patch = mockBrandToPatch(next, brand);
      await useBrandStore.getState().update(brand.id, patch);
    },
  };
}

/** The brand's Setup projection — for rendering real values in a panel. */
export function brandView(brand: Brand): MockBrand {
  return brandToMockBrand(brand);
}
