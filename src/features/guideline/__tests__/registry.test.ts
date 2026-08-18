import { describe, expect, it } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import {
  DEFAULT_GUIDELINE_TEMPLATE_ID,
  EDITORIAL_GUIDELINE,
  GUIDELINE_TEMPLATES,
  getGuidelineTemplate,
  guidelineEditorKey,
} from '../templates/registry';

const brand = {
  id: 'brand-123',
  slug: 'acme',
  name: 'Acme',
  primaryColor: '#1A1A2E',
  fonts: { primary: 'Inter' },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Brand;

describe('the guideline template registry', () => {
  it('ships exactly one template for the MVP', () => {
    expect(GUIDELINE_TEMPLATES).toHaveLength(1);
  });

  it('resolves a template by id', () => {
    expect(getGuidelineTemplate('editorial')).toBe(EDITORIAL_GUIDELINE);
  });

  it('returns nothing for an unknown or missing id, so the route can redirect', () => {
    expect(getGuidelineTemplate('does-not-exist')).toBeUndefined();
    expect(getGuidelineTemplate(undefined)).toBeUndefined();
  });

  it('has a default that actually exists', () => {
    expect(getGuidelineTemplate(DEFAULT_GUIDELINE_TEMPLATE_ID)).toBeDefined();
  });

  it('KEEPS the brand-guides editor key — changing it orphans existing edits', () => {
    // Slide snapshots are stored under `${editorKeyPrefix}-${brandId}`, and the
    // page this replaced used `brand-guides-${brand.id}`. If this ever changes,
    // every deck anyone has already edited silently reverts to the template.
    expect(guidelineEditorKey(EDITORIAL_GUIDELINE, brand.id)).toBe('brand-guides-brand-123');
  });

  it('scopes the editor key per brand', () => {
    expect(guidelineEditorKey(EDITORIAL_GUIDELINE, 'a')).not.toBe(
      guidelineEditorKey(EDITORIAL_GUIDELINE, 'b'),
    );
  });

  it('builds a real deck from a brand', () => {
    const slides = EDITORIAL_GUIDELINE.buildSlides(brand);
    expect(slides.length).toBeGreaterThan(20);
    expect(slides[0]?.id).toBe('cover');
    // Every slide needs a stable id — the snapshot store keys edits by it, so a
    // duplicate would make two pages share one set of edits.
    expect(new Set(slides.map((s) => s.id)).size).toBe(slides.length);
    for (const slide of slides) {
      expect(slide.name).toBeTruthy();
      expect(typeof slide.render).toBe('function');
    }
  });

  it('declares chapters without a page count, so the two cannot drift', () => {
    expect(EDITORIAL_GUIDELINE.sections.length).toBeGreaterThan(0);
    // The card reads the real length off the built deck; copy must not repeat it.
    expect(EDITORIAL_GUIDELINE.description).not.toMatch(/\b\d+\s+(pages?|chapters?)\b/i);
  });
});
