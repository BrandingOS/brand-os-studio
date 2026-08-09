// LocalTemplatesService — Phase 4 dev default.
//
// localStorage-backed implementation of ITemplatesService that
// mirrors the SQL schema from
// supabase/migrations/20260504000000_009_templates_phase_4.sql.
//
// Bootstrap: on first read, populates from the bundled seed data at
// src/features/templates/seeds/. Subsequent reads use whatever the
// app has written (so user-uploaded templates from 4.4 persist).
//
// The Supabase-backed swap is a one-line change in src/core/boot.ts
// once the migration is deployed.

import type { ITemplatesService } from '@/core/services/ITemplatesService';
import type {
  Template,
  TemplateCategory,
  TemplateListFilters,
  TemplateSearchParams,
} from '@/features/templates/types';
import {
  SEED_CATEGORIES,
  SEED_TEMPLATES,
} from '@/features/templates/seeds';

const STORAGE_KEY_CATEGORIES = 'brandos:templates:categories';
const STORAGE_KEY_TEMPLATES = 'brandos:templates:templates';
const STORAGE_KEY_BOOTSTRAPPED = 'brandos:templates:bootstrapped-v1';

interface SerializedShape<T> {
  items: T[];
  version: number;
}

// Bump VERSION when the seed inventory or thumbnail format changes
// so existing dev caches re-bootstrap on next read.
//   v1 — Phase 4.1 initial seeds.
//   v2 — Phase 5: thumbnails now render real layers (was 3 placeholder
//        bars). Old cached data URIs still hold the skeletons; bumping
//        forces a fresh seed. User-uploaded templates from 4.4 are
//        preserved across the bump.
const VERSION = 2;

export class LocalTemplatesService implements ITemplatesService {
  private categoriesCache: TemplateCategory[] | null = null;
  private templatesCache: Template[] | null = null;

  // ─── Bootstrap ─────────────────────────────────────────────────────

  private ensureBootstrap(): void {
    try {
      if (localStorage.getItem(STORAGE_KEY_BOOTSTRAPPED) === String(VERSION)) {
        return;
      }
      // Fresh / version mismatch — re-seed. Preserve user-uploaded
      // templates from the prior version so a thumbnail-format bump
      // doesn't wipe community submissions (Phase 4.4).
      const carriedOver = readUserUploadedFromStorage();
      this.persistCategories(SEED_CATEGORIES);
      this.persistTemplates([...SEED_TEMPLATES, ...carriedOver]);
      localStorage.setItem(STORAGE_KEY_BOOTSTRAPPED, String(VERSION));
    } catch {
      // localStorage unavailable (private mode, quota) — fall through;
      // reads will return seeds from in-memory cache.
      this.categoriesCache = SEED_CATEGORIES;
      this.templatesCache = SEED_TEMPLATES;
    }
  }

  private readCategories(): TemplateCategory[] {
    if (this.categoriesCache) return this.categoriesCache;
    this.ensureBootstrap();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
      if (!raw) {
        this.categoriesCache = SEED_CATEGORIES;
        return this.categoriesCache;
      }
      const parsed = JSON.parse(raw) as SerializedShape<TemplateCategory>;
      this.categoriesCache = parsed.items ?? SEED_CATEGORIES;
      return this.categoriesCache;
    } catch {
      return SEED_CATEGORIES;
    }
  }

  private readTemplates(): Template[] {
    if (this.templatesCache) return this.templatesCache;
    this.ensureBootstrap();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
      if (!raw) {
        this.templatesCache = SEED_TEMPLATES;
        return this.templatesCache;
      }
      const parsed = JSON.parse(raw) as SerializedShape<Template>;
      this.templatesCache = parsed.items ?? SEED_TEMPLATES;
      return this.templatesCache;
    } catch {
      return SEED_TEMPLATES;
    }
  }

  private persistCategories(items: TemplateCategory[]): void {
    this.categoriesCache = items;
    try {
      localStorage.setItem(
        STORAGE_KEY_CATEGORIES,
        JSON.stringify({ items, version: VERSION }),
      );
    } catch {
      /* keep in-memory cache */
    }
  }

  private persistTemplates(items: Template[]): void {
    this.templatesCache = items;
    try {
      localStorage.setItem(
        STORAGE_KEY_TEMPLATES,
        JSON.stringify({ items, version: VERSION }),
      );
    } catch {
      /* keep in-memory cache */
    }
  }

  // ─── Categories API ───────────────────────────────────────────────

  async listCategories(): Promise<TemplateCategory[]> {
    return [...this.readCategories()].sort(
      (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
    );
  }

  async getCategory(idOrSlug: string): Promise<TemplateCategory | null> {
    const cats = this.readCategories();
    return cats.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }

  // ─── Templates API — read ─────────────────────────────────────────

  async listTemplates(filters?: TemplateListFilters): Promise<Template[]> {
    let result = this.readTemplates();
    if (filters) {
      result = applyFilters(result, filters);
      result = sortTemplates(result, filters.sort ?? 'useCount-desc');
      result = paginate(result, filters.limit, filters.offset);
    }
    return result;
  }

  async getTemplate(idOrSlug: string): Promise<Template | null> {
    const all = this.readTemplates();
    return all.find((t) => t.id === idOrSlug || t.slug === idOrSlug) ?? null;
  }

  async searchTemplates(params: TemplateSearchParams): Promise<Template[]> {
    const q = params.query.trim().toLowerCase();
    let result = this.readTemplates();
    if (q.length > 0) {
      result = result.filter((t) => {
        const hay = [
          t.name,
          t.description ?? '',
          ...(t.tags ?? []),
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }
    result = applyFilters(result, params);
    result = sortTemplates(result, params.sort ?? 'useCount-desc');
    result = paginate(result, params.limit, params.offset);
    return result;
  }

  // ─── Templates API — mutate ───────────────────────────────────────

  async incrementUseCount(id: string): Promise<void> {
    const all = this.readTemplates();
    const next = all.map((t) =>
      t.id === id ? { ...t, useCount: (t.useCount ?? 0) + 1 } : t,
    );
    this.persistTemplates(next);
  }

  async createTemplate(
    input: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>,
  ): Promise<Template> {
    const now = new Date().toISOString();
    const created: Template = {
      ...input,
      id: crypto.randomUUID(),
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.persistTemplates([...this.readTemplates(), created]);
    return created;
  }

  async updateTemplate(id: string, patch: Partial<Template>): Promise<Template> {
    const all = this.readTemplates();
    const idx = all.findIndex((t) => t.id === id);
    if (idx < 0) throw new Error(`No template with id ${id}`);
    // Seed/system templates (curated, ai_prompt_preset) are READ-ONLY — only
    // user-owned records may be mutated. Prevents demo fixtures being treated as
    // editable user data (and, post-migration-009, cross-user DB corruption).
    if (!isUserOwned(all[idx])) {
      throw new Error(`Cannot modify a system template (source="${all[idx].source}")`);
    }
    const next: Template = {
      ...all[idx],
      ...patch,
      id: all[idx].id, // never overwrite id
      source: all[idx].source, // never reclassify a user template as system
      updatedAt: new Date().toISOString(),
    };
    const replaced = [...all];
    replaced[idx] = next;
    this.persistTemplates(replaced);
    return next;
  }

  async deleteTemplate(id: string): Promise<void> {
    const all = this.readTemplates();
    const target = all.find((t) => t.id === id);
    // No-op for unknown ids; refuse to delete seed/system fixtures.
    if (target && !isUserOwned(target)) {
      throw new Error(`Cannot delete a system template (source="${target.source}")`);
    }
    this.persistTemplates(all.filter((t) => t.id !== id));
  }
}

/** A template the user owns (their "save as template" output) vs a bundled
 *  seed/system/example fixture. Only user-owned records are mutable. */
function isUserOwned(t: Template): boolean {
  return t.source === 'user_uploaded';
}

// ─── Pure helpers (testable in isolation) ───────────────────────────────

function applyFilters(
  rows: Template[],
  f: TemplateListFilters,
): Template[] {
  return rows.filter((t) => {
    if (f.categoryId && t.categoryId !== f.categoryId) return false;
    if (f.source) {
      const allowed = Array.isArray(f.source) ? f.source : [f.source];
      if (!allowed.includes(t.source)) return false;
    }
    if (f.mood) {
      const allowed = Array.isArray(f.mood) ? f.mood : [f.mood];
      if (!t.mood || !allowed.includes(t.mood)) return false;
    }
    if (f.tags && f.tags.length > 0) {
      const tagSet = new Set(t.tags ?? []);
      if (!f.tags.every((tag) => tagSet.has(tag))) return false;
    }
    if (f.visibility && t.visibility !== f.visibility) return false;
    if (f.uploadStatus && t.uploadStatus !== f.uploadStatus) return false;
    if (f.uploadedByUserId && t.uploadedByUserId !== f.uploadedByUserId) {
      return false;
    }
    return true;
  });
}

function sortTemplates(
  rows: Template[],
  sort: NonNullable<TemplateListFilters['sort']>,
): Template[] {
  const out = [...rows];
  switch (sort) {
    case 'useCount-desc':
      out.sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0));
      break;
    case 'createdAt-desc':
      out.sort((a, b) =>
        (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
      );
      break;
    case 'name-asc':
      out.sort((a, b) => a.name.localeCompare(b.name));
      break;
  }
  return out;
}

function paginate<T>(
  rows: T[],
  limit?: number,
  offset?: number,
): T[] {
  if (offset === undefined && limit === undefined) return rows;
  const start = offset ?? 0;
  const end = limit !== undefined ? start + limit : rows.length;
  return rows.slice(start, end);
}

/**
 * Read user-uploaded templates from the prior cache version. Used
 * by ensureBootstrap() to preserve community submissions across a
 * VERSION bump that re-seeds the curated set.
 */
function readUserUploadedFromStorage(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SerializedShape<Template>;
    return (parsed.items ?? []).filter(
      (t) => t.source === 'user_uploaded',
    );
  } catch {
    return [];
  }
}
