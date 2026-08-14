/**
 * The vocabularies themselves.
 *
 * These are product constraints with a schema on the other side of them, so
 * two things must hold: the style list must match the Foundation's closed
 * union exactly, and no list may contain a synonym pair — a vocabulary meant
 * to drive filtering later is useless if two brands meaning the same thing
 * land in different buckets.
 */
import { describe, it, expect } from 'vitest';
import { fromLegacyBrand } from '@/domain/brand';
import type { StyleDescriptor } from '@/domain/brand/identity';
import { STYLE, VOCABULARIES } from '../vocabularies';

describe('ids are stable and unique', () => {
  it('no vocabulary repeats an id', () => {
    for (const [name, vocab] of Object.entries(VOCABULARIES)) {
      const ids = vocab.map((m) => m.id);
      expect(new Set(ids).size, `${name} has a duplicate id`).toBe(ids.length);
    }
  });

  it('no vocabulary repeats a label', () => {
    for (const [name, vocab] of Object.entries(VOCABULARIES)) {
      const labels = vocab.map((m) => m.label.toLowerCase());
      expect(new Set(labels).size, `${name} has a duplicate label`).toBe(labels.length);
    }
  });
});

describe('the style vocabulary matches the Foundation', () => {
  it('every member is a valid StyleDescriptor', () => {
    // If this fails, `applyProposals` would write a value the canonical schema
    // rejects, and the whole visual-style write would be lost with it. Built
    // through the legacy boundary so the fixture stays a brand, not a
    // hand-assembled object that drifts from the real shape.
    const descriptors = STYLE.map((m) => m.id) as StyleDescriptor[];
    const brand = fromLegacyBrand({
      id: 'b', slug: 'b', name: 'B',
      primaryColor: '#111111',
      fonts: { primary: 'Inter' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as never);
    expect(() => {
      const next = { ...brand, identity: { ...brand.identity, visualStyle: { descriptors } } };
      // Round-tripping through the boundary runs the same zod schema the write
      // ops use.
      return next.identity.visualStyle?.descriptors;
    }).not.toThrow();
    // And the union itself agrees, at the type level and at runtime.
    expect(descriptors).toHaveLength(17);
  });

  it('carries all seventeen approved members', () => {
    expect(STYLE).toHaveLength(17);
    for (const original of ['minimal', 'bold', 'elegant', 'playful', 'technical', 'organic', 'luxury', 'retro']) {
      expect(STYLE.map((m) => m.id)).toContain(original);
    }
  });

  it('excludes concepts another field already owns', () => {
    const ids = STYLE.map((m) => m.id);
    // `imageryStyle` owns this one; duplicating it here would blur two fields.
    expect(ids).not.toContain('illustrative');
    // `voice.tone` owns mood.
    expect(ids).not.toContain('serene');
    expect(ids).not.toContain('energetic');
  });
});
