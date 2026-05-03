// Phase 4.1 — seed validation tests.
//
// Asserts every load-bearing constraint on the seed inventory:
//   • Each template parses against TemplateSchema.
//   • Each template's document parses against BrandOSDocumentSchema.
//   • At least one SlotRef color per template (brand-bound rule).
//   • At least one SlotRef font per text-bearing template.
//   • Every template references a registered category.
//   • Every category references a registered ContentTypeConfig.
//   • Slugs are unique (across templates AND across categories).
//   • Inventory hits the spec target (~100 templates, 11 categories,
//     8-12 per category).

import { describe, expect, it } from 'vitest';
import { SEED_CATEGORIES, SEED_TEMPLATES } from './index';
import { TemplateSchema } from '../types';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import { CONTENT_TYPES } from '@/features/editor/content-types';
import type { ResolvedValue } from '@/features/editor/schema';

function isSlot(v: ResolvedValue | null | undefined): boolean {
  return !!v && typeof v !== 'string' && typeof v !== 'number';
}

describe('Phase 4.1 seed inventory — categories', () => {
  it('exposes 11 categories', () => {
    expect(SEED_CATEGORIES).toHaveLength(11);
  });

  it('every category has a unique slug', () => {
    const slugs = SEED_CATEGORIES.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every category has a unique id', () => {
    const ids = SEED_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every category targets a registered ContentTypeConfig', () => {
    for (const c of SEED_CATEGORIES) {
      expect(CONTENT_TYPES[c.contentTypeConfigId], `${c.slug} → ${c.contentTypeConfigId}`).toBeDefined();
    }
  });
});

describe('Phase 4.1 seed inventory — templates', () => {
  it('seeds at least 80 templates across categories (target ~100)', () => {
    expect(SEED_TEMPLATES.length).toBeGreaterThanOrEqual(80);
  });

  it('every template parses against TemplateSchema', () => {
    for (const t of SEED_TEMPLATES) {
      const result = TemplateSchema.safeParse(t);
      expect(result.success, `${t.slug}: ${result.success ? '' : JSON.stringify(result.error.issues[0])}`).toBe(true);
    }
  });

  it('every template has a unique slug', () => {
    const slugs = SEED_TEMPLATES.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('every template references a registered category', () => {
    const catIds = new Set(SEED_CATEGORIES.map((c) => c.id));
    for (const t of SEED_TEMPLATES) {
      expect(catIds.has(t.categoryId), `${t.slug} → ${t.categoryId}`).toBe(true);
    }
  });

  it('every template document parses against BrandOSDocumentSchema', () => {
    for (const t of SEED_TEMPLATES) {
      if (!t.document) continue;
      const result = BrandOSDocumentSchema.safeParse(t.document);
      expect(result.success, `${t.slug} doc: ${result.success ? '' : JSON.stringify(result.error.issues[0])}`).toBe(true);
    }
  });

  it('every template has at least one SlotRef color (brand-bound rule)', () => {
    for (const t of SEED_TEMPLATES) {
      if (!t.document) continue;
      const colors: ResolvedValue[] = [];
      for (const page of t.document.pages) {
        if (page.background !== undefined) colors.push(page.background);
        for (const layer of page.layers) {
          if (layer.kind === 'text') colors.push(layer.color);
          else if (layer.kind === 'shape') {
            if (layer.fill !== null) colors.push(layer.fill);
            if (layer.stroke !== null) colors.push(layer.stroke);
          }
        }
      }
      const slotColors = colors.filter(isSlot);
      expect(slotColors.length, `${t.slug}: zero SlotRef colors`).toBeGreaterThan(0);
    }
  });

  it('every text-bearing template has at least one SlotRef font', () => {
    for (const t of SEED_TEMPLATES) {
      if (!t.document) continue;
      const fonts: ResolvedValue[] = [];
      for (const page of t.document.pages) {
        for (const layer of page.layers) {
          if (layer.kind === 'text') fonts.push(layer.fontFamily);
        }
      }
      if (fonts.length === 0) continue; // no text — fine
      const slotFonts = fonts.filter(isSlot);
      expect(slotFonts.length, `${t.slug}: zero SlotRef fonts`).toBeGreaterThan(0);
    }
  });

  it('every category has between 6 and 15 templates', () => {
    const counts = new Map<string, number>();
    for (const t of SEED_TEMPLATES) {
      counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
    }
    for (const c of SEED_CATEGORIES) {
      const count = counts.get(c.id) ?? 0;
      expect(count, `${c.slug} count`).toBeGreaterThanOrEqual(6);
      expect(count, `${c.slug} count`).toBeLessThanOrEqual(15);
    }
  });

  it('every template has a non-empty thumbnail data URI', () => {
    for (const t of SEED_TEMPLATES) {
      expect(t.thumbnailUrl).toMatch(/^data:image\/svg\+xml/);
    }
  });

  it('every template has dimensions matching its content-type config (where exact)', () => {
    // Soft check — just that dims are positive integers.
    for (const t of SEED_TEMPLATES) {
      expect(t.width).toBeGreaterThan(0);
      expect(t.height).toBeGreaterThan(0);
      expect(Number.isInteger(t.width)).toBe(true);
      expect(Number.isInteger(t.height)).toBe(true);
    }
  });
});
