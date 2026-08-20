import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import { demoBrandIdentity } from '@/data/demo';
import { raqmBrand } from '@/data/brands/raqm';
import { skamBrand } from '@/data/brands/skam';
import { vectorBrand } from '@/data/brands/vector';
import { uniexBrand } from '@/data/brands/uniex';
import { safeLocalStorageSet } from '@/shared/utils/imageUpload';
import { migrateBrandToCurrent, migrateBrands } from '@/shared/brand/migrateSchema';
import { applySeedOverride, patchSeedOverride } from '@/shared/brand/seedBrandOverrides';

export interface BrandsService {
  list(): Promise<Brand[]>;
  getById(id: string): Promise<Brand | null>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<Brand>;
  delete(id: string): Promise<void>;
}

/**
 * Seed brands are FIXTURES, not examples the product offers any more.
 *
 * They used to be merged into `list()`, so a signed-out visitor met five
 * brands that are not this product. The demo brand replaced that: it is an
 * ordinary row a new ACCOUNT is given (migration 033), which is what lets the
 * user delete it — these cannot be deleted at all, and `delete()` below still
 * refuses, which is exactly why they were the wrong answer.
 *
 * They stay resolvable by id and slug so direct URLs, tests and dev demos keep
 * working. They are simply no longer listed.
 */
const SEED_BRANDS: Brand[] = [raqmBrand, skamBrand, vectorBrand, uniexBrand, demoBrandIdentity];
const SEED_BRAND_IDS = new Set(SEED_BRANDS.map(b => b.id));

export class LocalBrandsService implements BrandsService {
  private readonly storageKey = 'brandos:brands';

  private getUserBrands(): Brand[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Everything RESOLVABLE — the user's brands plus the seed fixtures. This is
   * the lookup surface (getById / getBySlug), deliberately wider than `list`.
   */
  private getAllBrands(): Brand[] {
    const userBrands = this.getUserBrands();
    const userBrandIds = new Set(userBrands.map(b => b.id));
    const missingSeeds = SEED_BRANDS
      .filter(sb => !userBrandIds.has(sb.id))
      .map(applySeedOverride);
    return [...missingSeeds, ...userBrands];
  }

  /**
   * The user's OWN brands. Seeds are not listed — see SEED_BRANDS above.
   *
   * A guest therefore sees an empty dashboard, which is the intended answer:
   * the demo brand is something an account is given, and that is a reason to
   * make one rather than something to browse without one.
   */
  async list(): Promise<Brand[]> {
    return migrateBrands(this.getUserBrands());
  }

  async getById(id: string): Promise<Brand | null> {
    const brands = this.getAllBrands();
    const found = brands.find(b => b.id === id);
    return found ? migrateBrandToCurrent(found) : null;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    const brands = this.getAllBrands();
    const found = brands.find(b => b.slug === slug);
    return found ? migrateBrandToCurrent(found) : null;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const userBrands = this.getUserBrands();
    const brand: Brand = {
      ...input,
      id: `brand_${Date.now()}`,
      slug: this.uniqueSlug(input.slug || this.generateSlug(input.name)),
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = safeLocalStorageSet(this.storageKey, JSON.stringify([...userBrands, brand]));
    if (!result.success) throw new Error(result.error);
    // Migrate like list()/getBySlug() do — the store caches this return
    // value as `current`, and an un-migrated brand there means derived
    // fields (logoSystem, brandAssets, colorSystem) are missing until a
    // reload.
    return migrateBrandToCurrent(brand);
  }

  async update(id: string, patch: Partial<Brand>): Promise<Brand> {
    const allBrands = this.getAllBrands();
    const index = allBrands.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Brand with id ${id} not found`);
    // A caller that supplies `updatedAt` is telling us this write is not an
    // edit to the brand — the dashboard does it when only the project's card
    // changed. Everything else stamps now, as it always did.
    const updatedBrand = { ...allBrands[index], ...patch, updatedAt: patch.updatedAt ?? new Date() };

    // Seed brands persist as a slim diff in `seedBrandOverrides` so the
    // canonical seed in /src/data/brands stays the source of truth and
    // edits propagate to every consumer that reads the brand.
    if (SEED_BRAND_IDS.has(id)) {
      patchSeedOverride(id, { ...patch, updatedAt: patch.updatedAt ?? new Date() });
      return migrateBrandToCurrent(updatedBrand);
    }

    // User-authored brands persist as full snapshots in `brandos:brands`.
    const userBrands = this.getUserBrands();
    const userIdx = userBrands.findIndex(b => b.id === id);
    if (userIdx >= 0) {
      userBrands[userIdx] = updatedBrand;
    } else {
      userBrands.push(updatedBrand);
    }
    const result = safeLocalStorageSet(this.storageKey, JSON.stringify(userBrands));
    if (!result.success) throw new Error(result.error);
    return migrateBrandToCurrent(updatedBrand);
  }

  private generateSlug(name: string): string {
    // Hyphenated slugs (ONB-06) — "QA Brand" → "qa-brand", the URL
    // convention the rest of the product uses. Existing stored brands
    // keep whatever slug they were created with, so old links survive.
    return name.toLowerCase().trim().replace(/[^a-zA-Z0-9\s-]/g, '').replace(/[\s_]+/g, '-');
  }

  /** Slugs are the URL identity — two brands sharing one makes
   *  `getBySlug` (and every /b/:slug route) resolve to whichever comes
   *  first. Supabase enforces this with a unique constraint; locally we
   *  suffix -2/-3… until the slug is free. */
  private uniqueSlug(base: string): string {
    const taken = new Set(this.getAllBrands().map(b => b.slug));
    if (!taken.has(base)) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base}-${n}`;
      if (!taken.has(candidate)) return candidate;
    }
  }

  async delete(id: string): Promise<void> {
    if (SEED_BRAND_IDS.has(id)) return; // Cannot delete seed brands
    const userBrands = this.getUserBrands();
    safeLocalStorageSet(this.storageKey, JSON.stringify(userBrands.filter(b => b.id !== id)));
  }
}

export const brandsService = new LocalBrandsService();
